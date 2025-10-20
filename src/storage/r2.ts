import { ConversationHistory, ConversationMessage } from '../types';

export class R2Storage {
  private r2: R2Bucket;

  constructor(r2: R2Bucket) {
    this.r2 = r2;
  }

  async getConversationHistory(roomId: string, limit: number = 20): Promise<ConversationMessage[]> {
    const key = `conversations/${roomId}/history.json`;

    try {
      const object = await this.r2.get(key);
      if (!object) return [];

      const data = await object.text();
      const history: ConversationHistory = JSON.parse(data);

      return history.messages.slice(-limit);
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  async appendConversationMessage(roomId: string, message: ConversationMessage): Promise<void> {
    const key = `conversations/${roomId}/history.json`;

    let history: ConversationHistory;

    try {
      const object = await this.r2.get(key);
      if (object) {
        const data = await object.text();
        history = JSON.parse(data);
      } else {
        history = {
          roomId,
          messages: [],
          lastUpdated: Date.now(),
        };
      }
    } catch (error) {
      history = {
        roomId,
        messages: [],
        lastUpdated: Date.now(),
      };
    }

    history.messages.push(message);
    history.lastUpdated = Date.now();

    if (history.messages.length > 100) {
      history.messages = history.messages.slice(-100);
    }

    await this.r2.put(key, JSON.stringify(history), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
  }

  async clearConversationHistory(roomId: string): Promise<void> {
    const key = `conversations/${roomId}/history.json`;
    await this.r2.delete(key);
  }

  async saveLog(roomId: string, logData: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const key = `logs/${date}/${roomId}/${timestamp}.json`;

    await this.r2.put(key, JSON.stringify(logData), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
  }

  async saveImage(messageId: string, imageData: ArrayBuffer, contentType: string): Promise<string> {
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const key = `images/${messageId}.${ext}`;

    await this.r2.put(key, imageData, {
      httpMetadata: {
        contentType: contentType,
      },
    });

    return key;
  }

  async getImage(key: string): Promise<R2ObjectBody | null> {
    return await this.r2.get(key);
  }

  async saveUpload(userId: string, fileId: string, data: ArrayBuffer, contentType: string): Promise<string> {
    const key = `uploads/${userId}/${fileId}`;

    await this.r2.put(key, data, {
      httpMetadata: {
        contentType: contentType,
      },
    });

    return key;
  }

  async backupConfig(configData: any): Promise<void> {
    const timestamp = Date.now();
    const key = `config/backup-${timestamp}.json`;

    await this.r2.put(key, JSON.stringify(configData), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
  }

  async listConversations(): Promise<string[]> {
    const list = await this.r2.list({ prefix: 'conversations/' });
    const roomIds = new Set<string>();

    for (const object of list.objects) {
      const parts = object.key.split('/');
      if (parts.length >= 2) {
        roomIds.add(parts[1]);
      }
    }

    return Array.from(roomIds);
  }
}
