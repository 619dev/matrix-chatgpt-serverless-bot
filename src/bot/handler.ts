import { Env, ConversationMessage } from '../types';
import { MatrixClient } from '../matrix/client';
import { AIClient } from '../ai/client';
import { KVStorage } from '../storage/kv';
import { R2Storage } from '../storage/r2';
import { CommandHandler } from './commands';

export class MessageHandler {
  private env: Env;
  private matrixClient: MatrixClient;
  private kvStorage: KVStorage;
  private r2Storage: R2Storage;
  private commandHandler: CommandHandler;

  constructor(env: Env) {
    this.env = env;
    this.matrixClient = new MatrixClient(env.MATRIX_HOMESERVER);
    this.kvStorage = new KVStorage(env.KV);
    this.r2Storage = new R2Storage(env.R2);
    this.commandHandler = new CommandHandler();
  }

  async initialize(): Promise<void> {
    const authInfo = await this.kvStorage.getAuthInfo();
    if (authInfo) {
      this.matrixClient.setAccessToken(authInfo.accessToken, authInfo.userId, authInfo.deviceId);
    }
  }

  async handleMessage(roomId: string, event: any): Promise<void> {
    const sender = event.sender;
    const content = event.content;

    if (content.msgtype !== 'm.text') {
      return;
    }

    const message = content.body;

    const isAllowed = await this.kvStorage.isAllowedUser(sender);
    if (!isAllowed) {
      return;
    }

    const botUserId = this.matrixClient.getUserId();
    const isMentioned = message.includes(botUserId || '');
    const isGptCommand = message.startsWith('!gpt ');

    if (!isMentioned && !message.startsWith('!') && !isGptCommand) {
      return;
    }

    try {
      await this.matrixClient.sendTyping(roomId, true);

      const commandContext = {
        roomId,
        sender,
        env: this.env,
        kvStorage: this.kvStorage,
        r2Storage: this.r2Storage,
      };

      const commandResponse = await this.commandHandler.handleCommand(message, commandContext);

      if (commandResponse) {
        await this.matrixClient.sendMessage(roomId, commandResponse);
        return;
      }

      let cleanMessage = message;
      if (isGptCommand) {
        cleanMessage = message.replace(/^!gpt\s+/, '').trim();
      } else if (botUserId && message.includes(botUserId)) {
        cleanMessage = message.replace(botUserId, '').trim();
      }

      await this.r2Storage.appendConversationMessage(roomId, {
        role: 'user',
        content: cleanMessage,
        timestamp: Date.now(),
      });

      const isImageRequest = this.isImageGenerationRequest(cleanMessage);

      if (isImageRequest) {
        const roomConfig = await this.kvStorage.getRoomConfig(roomId);
        const globalConfig = await this.kvStorage.getGlobalConfig();
        const currentModel = roomConfig?.model || globalConfig.defaultModel || this.env.DEFAULT_MODEL || 'gpt-3.5-turbo';

        console.log('Image generation detected');
        console.log('Current model:', currentModel);
        console.log('Base URL:', globalConfig.providers?.[globalConfig.defaultProvider || 'openai']?.baseURL);

        await this.matrixClient.sendMessage(roomId, `🎨 Generating image with gpt-image-1...\nThis may take up to 3 minutes...`);
        await this.matrixClient.sendTyping(roomId, false);

        this.generateResponseAsync(roomId, cleanMessage, event.event_id);
        return;
      }

      const response = await this.generateResponse(roomId, cleanMessage);

      console.log('Generated response:', response);
      console.log('Response type:', typeof response);
      console.log('Response length:', response?.length);

      if (!response || response.trim() === '') {
        await this.matrixClient.sendMessage(roomId, '❌ Received empty response from AI');
        return;
      }

      await this.r2Storage.appendConversationMessage(roomId, {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });

      await this.sendResponseWithImages(roomId, response);

      await this.matrixClient.sendReadReceipt(roomId, event.event_id);
    } catch (error) {
      console.error('Error handling message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      let userMessage = `❌ Error: ${errorMessage}`;

      if (errorMessage.includes('timeout') || errorMessage.includes('524')) {
        userMessage = '⏱️ Request timeout. Image generation takes longer - please try again or use a faster model.';
      }

      await this.matrixClient.sendMessage(roomId, userMessage);
    } finally {
      await this.matrixClient.sendTyping(roomId, false);
    }
  }

  private async generateResponse(roomId: string, userMessage: string): Promise<string> {
    const roomConfig = await this.kvStorage.getRoomConfig(roomId);
    const globalConfig = await this.kvStorage.getGlobalConfig();

    let provider = null;
    let baseURL = this.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    let apiKey = this.env.OPENAI_API_KEY;
    let model = roomConfig?.model || this.env.DEFAULT_MODEL || globalConfig.defaultModel || 'gpt-4';

    if (roomConfig?.provider) {
      provider = await this.kvStorage.getProvider(roomConfig.provider);
      if (provider) {
        baseURL = provider.baseURL;
        apiKey = provider.apiKey;
        model = roomConfig.model || provider.defaultModel;
      }
    }

    const aiClient = new AIClient(baseURL, apiKey);

    const history = await this.r2Storage.getConversationHistory(
      roomId,
      globalConfig.maxContextMessages || 20
    );

    const messages = [
      {
        role: 'system',
        content: roomConfig?.systemPrompt || 'You are a helpful assistant in a Matrix chat room.',
      },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const isImageModel = model.toLowerCase().includes('image') || model.toLowerCase().includes('dalle');
    const timeout = isImageModel ? 180000 : 120000;

    console.log(`Using model: ${model}, timeout: ${timeout}ms`);

    const response = await aiClient.chatCompletion({
      model: model,
      messages: messages,
      temperature: roomConfig?.temperature || 0.7,
      max_tokens: roomConfig?.maxTokens || 2000,
    }, timeout);

    console.log('Full API response:', JSON.stringify(response, null, 2));

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in response, full response:', response);
      return 'Error: AI returned empty response';
    }

    return content;
  }

  private async sendResponseWithImages(roomId: string, response: string): Promise<void> {
    console.log('Response content:', response);

    const imageUrlRegex = /(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|bmp|svg)(?:[^\s<>"']*))/gi;
    const generalUrlRegex = /(https?:\/\/[^\s<>"']+)/gi;

    let imageUrls: string[] | null = response.match(imageUrlRegex);

    if (!imageUrls) {
      const allUrls = response.match(generalUrlRegex);
      console.log('All URLs found:', allUrls);

      if (allUrls) {
        const filtered = allUrls.filter(url => {
          const lower = url.toLowerCase();
          return lower.includes('image') ||
                 lower.includes('img') ||
                 lower.includes('.png') ||
                 lower.includes('.jpg') ||
                 lower.includes('.jpeg') ||
                 lower.includes('.gif') ||
                 lower.includes('.webp');
        });
        if (filtered.length > 0) {
          imageUrls = filtered;
        }
      }
    }

    console.log('Image URLs detected:', imageUrls);

    if (imageUrls && imageUrls.length > 0) {
      let textContent = response;

      for (const imageUrl of imageUrls) {
        textContent = textContent.replace(imageUrl, '').trim();
      }

      if (textContent) {
        await this.matrixClient.sendMessage(roomId, textContent);
      }

      for (const imageUrl of imageUrls) {
        try {
          console.log('Attempting to send image:', imageUrl);
          await this.matrixClient.sendImageMessage(roomId, imageUrl, 'Generated Image');
          console.log('Image sent successfully');
        } catch (error) {
          console.error(`Failed to send image ${imageUrl}:`, error);
          await this.matrixClient.sendMessage(roomId, `Image URL: ${imageUrl}`);
        }
      }
    } else {
      await this.matrixClient.sendMessage(roomId, response);
    }
  }

  private isImageGenerationRequest(message: string): boolean {
    const imageKeywords = [
      'draw', 'generate', 'create', 'make', 'show',
      'image', 'picture', 'photo', 'illustration',
      '画', '生成', '创建', '制作', '绘制'
    ];

    const lowerMessage = message.toLowerCase();

    return imageKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async generateResponseAsync(roomId: string, message: string, eventId: string): Promise<void> {
    try {
      const globalConfig = await this.kvStorage.getGlobalConfig();
      const provider = globalConfig.providers?.[globalConfig.defaultProvider || 'openai'];

      if (!provider) {
        throw new Error('No AI provider configured');
      }

      const aiClient = new AIClient(provider.baseURL, provider.apiKey);

      console.log('Generating image with prompt:', message);

      const imageUrl = await aiClient.generateImage(message, 'gpt-image-1');

      console.log('Generated image URL:', imageUrl);

      const response = `Here is your image:\n${imageUrl}`;

      await this.r2Storage.appendConversationMessage(roomId, {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });

      await this.matrixClient.sendMessage(roomId, `🎨 Image generated successfully!`);
      await this.matrixClient.sendMessage(roomId, imageUrl);

      await this.matrixClient.sendReadReceipt(roomId, eventId);
    } catch (error) {
      console.error('Error in async generation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      let userMessage = `❌ Error: ${errorMessage}`;

      if (errorMessage.includes('timeout') || errorMessage.includes('524')) {
        userMessage = '⏱️ Request timeout. The API took too long to respond. Please try again.';
      }

      await this.matrixClient.sendMessage(roomId, userMessage);
    }
  }
}
