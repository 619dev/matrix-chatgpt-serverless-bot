import { AIProvider, RoomConfig } from '../types';

export class KVStorage {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async getSyncToken(): Promise<string | null> {
    return await this.kv.get('sync:token');
  }

  async setSyncToken(token: string): Promise<void> {
    await this.kv.put('sync:token', token);
  }

  async getAccessToken(): Promise<string | null> {
    return await this.kv.get('auth:access_token');
  }

  async setAccessToken(token: string, userId: string, deviceId: string): Promise<void> {
    await this.kv.put('auth:access_token', token);
    await this.kv.put('auth:user_id', userId);
    await this.kv.put('auth:device_id', deviceId);
  }

  async getAuthInfo(): Promise<{ accessToken: string; userId: string; deviceId: string } | null> {
    const accessToken = await this.kv.get('auth:access_token');
    const userId = await this.kv.get('auth:user_id');
    const deviceId = await this.kv.get('auth:device_id');

    if (!accessToken || !userId || !deviceId) {
      return null;
    }

    return { accessToken, userId, deviceId };
  }

  async getRoomConfig(roomId: string): Promise<RoomConfig | null> {
    const data = await this.kv.get(`room:config:${roomId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async setRoomConfig(roomId: string, config: RoomConfig): Promise<void> {
    await this.kv.put(`room:config:${roomId}`, JSON.stringify(config));
  }

  async getUserSettings(userId: string): Promise<any> {
    const data = await this.kv.get(`user:settings:${userId}`);
    if (!data) return {};
    return JSON.parse(data);
  }

  async setUserSettings(userId: string, settings: any): Promise<void> {
    await this.kv.put(`user:settings:${userId}`, JSON.stringify(settings));
  }

  async getProvider(name: string): Promise<AIProvider | null> {
    const data = await this.kv.get(`provider:${name}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async setProvider(provider: AIProvider): Promise<void> {
    await this.kv.put(`provider:${provider.name}`, JSON.stringify(provider));
  }

  async listProviders(): Promise<AIProvider[]> {
    const list = await this.kv.list({ prefix: 'provider:' });
    const providers: AIProvider[] = [];

    for (const key of list.keys) {
      const data = await this.kv.get(key.name);
      if (data) {
        providers.push(JSON.parse(data));
      }
    }

    return providers;
  }

  async deleteProvider(name: string): Promise<void> {
    await this.kv.delete(`provider:${name}`);
  }

  async getGlobalConfig(): Promise<any> {
    const data = await this.kv.get('config:global');
    if (!data) {
      return {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4',
        maxContextMessages: 20,
      };
    }
    return JSON.parse(data);
  }

  async setGlobalConfig(config: any): Promise<void> {
    await this.kv.put('config:global', JSON.stringify(config));
  }

  async isAdmin(userId: string): Promise<boolean> {
    const admins = await this.kv.get('config:admins');
    if (!admins) return false;
    const adminList = JSON.parse(admins);
    return adminList.includes(userId);
  }

  async getAdminList(): Promise<string[]> {
    const admins = await this.kv.get('config:admins');
    if (!admins) return [];
    return JSON.parse(admins);
  }

  async setAdminList(admins: string[]): Promise<void> {
    await this.kv.put('config:admins', JSON.stringify(admins));
  }

  async isAllowedUser(userId: string): Promise<boolean> {
    const whitelist = await this.kv.get('config:whitelist');
    if (!whitelist) return true;
    const list = JSON.parse(whitelist);
    return list.includes(userId);
  }

  async getWhitelist(): Promise<string[]> {
    const whitelist = await this.kv.get('config:whitelist');
    if (!whitelist) return [];
    return JSON.parse(whitelist);
  }

  async setWhitelist(users: string[]): Promise<void> {
    await this.kv.put('config:whitelist', JSON.stringify(users));
  }
}
