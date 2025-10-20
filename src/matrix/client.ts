import { MatrixLoginResponse, MatrixSyncResponse, MatrixEvent } from '../types';

export class MatrixClient {
  private homeserver: string;
  private accessToken: string | null = null;
  private deviceId: string | null = null;
  private userId: string | null = null;

  constructor(homeserver: string) {
    this.homeserver = homeserver.replace(/\/$/, '');
  }

  async login(username: string, password: string): Promise<MatrixLoginResponse> {
    const response = await fetch(`${this.homeserver}/_matrix/client/v3/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'm.login.password',
        identifier: {
          type: 'm.id.user',
          user: username,
        },
        password: password,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Matrix login failed: ${response.status} ${error}`);
    }

    const data: MatrixLoginResponse = await response.json();
    this.accessToken = data.access_token;
    this.deviceId = data.device_id;
    this.userId = data.user_id;

    return data;
  }

  setAccessToken(token: string, userId: string, deviceId: string) {
    this.accessToken = token;
    this.userId = userId;
    this.deviceId = deviceId;
  }

  async sync(since?: string, timeout: number = 30000): Promise<MatrixSyncResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
      timeout: timeout.toString(),
    });

    if (since) {
      params.set('since', since);
    }

    const response = await fetch(
      `${this.homeserver}/_matrix/client/v3/sync?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Matrix sync failed: ${response.status} ${error}`);
    }

    return await response.json();
  }

  async sendMessage(roomId: string, content: string, msgtype: string = 'm.text'): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const txnId = `m${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

    const response = await fetch(
      `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msgtype: msgtype,
          body: content,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send message: ${response.status} ${error}`);
    }

    const data = await response.json() as { event_id: string };
    return data.event_id;
  }

  async sendTyping(roomId: string, typing: boolean, timeout: number = 30000): Promise<void> {
    if (!this.accessToken || !this.userId) {
      throw new Error('Not authenticated');
    }

    await fetch(
      `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/typing/${encodeURIComponent(this.userId)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          typing: typing,
          timeout: timeout,
        }),
      }
    );
  }

  async joinRoom(roomId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to join room: ${response.status} ${error}`);
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/leave`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to leave room: ${response.status} ${error}`);
    }
  }

  async sendReadReceipt(roomId: string, eventId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    await fetch(
      `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/receipt/m.read/${encodeURIComponent(eventId)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }
}
