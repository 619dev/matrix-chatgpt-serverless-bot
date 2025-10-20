import { Env } from '../types';
import { MatrixClient } from '../matrix/client';
import { KVStorage } from '../storage/kv';
import { MessageHandler } from '../bot/handler';

export class MatrixSync {
  private state: DurableObjectState;
  private env: Env;
  private syncToken: string | null = null;
  private isRunning: boolean = false;
  private messageHandler: MessageHandler;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.messageHandler = new MessageHandler(env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/start') {
      return await this.handleStart();
    }

    if (url.pathname === '/stop') {
      return await this.handleStop();
    }

    if (url.pathname === '/status') {
      return await this.handleStatus();
    }

    if (url.pathname === '/sync') {
      return await this.handleSync();
    }

    return new Response('Not found', { status: 404 });
  }

  async handleStart(): Promise<Response> {
    if (this.isRunning) {
      return new Response(JSON.stringify({ status: 'already_running' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    this.isRunning = true;
    await this.state.storage.put('isRunning', true);

    this.state.storage.setAlarm(Date.now() + 1000);

    return new Response(JSON.stringify({ status: 'started' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handleStop(): Promise<Response> {
    this.isRunning = false;
    await this.state.storage.put('isRunning', false);
    await this.state.storage.deleteAlarm();

    return new Response(JSON.stringify({ status: 'stopped' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handleStatus(): Promise<Response> {
    const isRunning = (await this.state.storage.get('isRunning')) || false;
    const syncToken = (await this.state.storage.get('syncToken')) || null;

    return new Response(
      JSON.stringify({
        isRunning,
        syncToken,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async handleSync(): Promise<Response> {
    try {
      await this.performSync();
      return new Response(JSON.stringify({ status: 'success' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  async alarm(): Promise<void> {
    const isRunning = (await this.state.storage.get('isRunning')) || false;

    if (!isRunning) {
      return;
    }

    try {
      await this.performSync();
    } catch (error) {
      console.error('Sync error:', error);
    }

    this.state.storage.setAlarm(Date.now() + 30000);
  }

  private async performSync(): Promise<void> {
    const kvStorage = new KVStorage(this.env.KV);

    const authInfo = await kvStorage.getAuthInfo();
    if (!authInfo) {
      throw new Error('Not authenticated');
    }

    const matrixClient = new MatrixClient(this.env.MATRIX_HOMESERVER);
    matrixClient.setAccessToken(authInfo.accessToken, authInfo.userId, authInfo.deviceId);

    let syncToken = await kvStorage.getSyncToken();

    const syncResponse = await matrixClient.sync(syncToken || undefined, 30000);

    await kvStorage.setSyncToken(syncResponse.next_batch);
    await this.state.storage.put('syncToken', syncResponse.next_batch);

    if (syncResponse.rooms?.invite) {
      for (const roomId of Object.keys(syncResponse.rooms.invite)) {
        try {
          await matrixClient.joinRoom(roomId);
          console.log(`Joined room: ${roomId}`);
        } catch (error) {
          console.error(`Failed to join room ${roomId}:`, error);
        }
      }
    }

    if (syncResponse.rooms?.join) {
      for (const [roomId, roomData] of Object.entries(syncResponse.rooms.join)) {
        const timeline = roomData.timeline;
        if (!timeline?.events) continue;

        for (const event of timeline.events) {
          if (event.type === 'm.room.message' && event.sender !== authInfo.userId) {
            await this.processMessage(roomId, event);
          }
        }
      }
    }
  }

  private async processMessage(roomId: string, event: any): Promise<void> {
    try {
      await this.messageHandler.initialize();
      await this.messageHandler.handleMessage(roomId, event);
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  }
}
