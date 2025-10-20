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

    if (!isMentioned && !message.startsWith('!')) {
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
      if (botUserId && message.includes(botUserId)) {
        cleanMessage = message.replace(botUserId, '').trim();
      }

      await this.r2Storage.appendConversationMessage(roomId, {
        role: 'user',
        content: cleanMessage,
        timestamp: Date.now(),
      });

      const response = await this.generateResponse(roomId, cleanMessage);

      await this.r2Storage.appendConversationMessage(roomId, {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });

      await this.matrixClient.sendMessage(roomId, response);

      await this.matrixClient.sendReadReceipt(roomId, event.event_id);
    } catch (error) {
      console.error('Error handling message:', error);
      await this.matrixClient.sendMessage(
        roomId,
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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

    const response = await aiClient.chatCompletion({
      model: model,
      messages: messages,
      temperature: roomConfig?.temperature || 0.7,
      max_tokens: roomConfig?.maxTokens || 2000,
    });

    return response.choices[0].message.content;
  }
}
