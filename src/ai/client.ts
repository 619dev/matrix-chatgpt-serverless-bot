import { ChatCompletionRequest, ChatCompletionResponse } from '../types';

export class AIClient {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async chatCompletion(request: ChatCompletionRequest, timeout: number = 120000): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI API request failed: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AI API request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  async chatCompletionStream(
    request: ChatCompletionRequest,
    onChunk: (content: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API stream request failed: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  async generateImage(prompt: string, model: string = 'dall-e-3', timeout: number = 180000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          n: 1,
          size: '1024x1024',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Image API request failed: ${response.status} ${error}`);
      }

      const result: any = await response.json();

      if (result.data && result.data[0] && result.data[0].url) {
        return result.data[0].url;
      }

      throw new Error('No image URL in response');
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Image generation timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
}
