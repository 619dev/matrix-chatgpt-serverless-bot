import { Env } from './types';
import { MatrixClient } from './matrix/client';
import { KVStorage } from './storage/kv';
import { R2Storage } from './storage/r2';
import { MessageHandler } from './bot/handler';

export { MatrixSync } from './durable-objects/MatrixSync';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('Matrix ChatGPT Bot is running', { status: 200 });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/login' && request.method === 'POST') {
      return await handleLogin(request, env);
    }

    if (url.pathname === '/start') {
      return await handleStart(env);
    }

    if (url.pathname === '/stop') {
      return await handleStop(env);
    }

    if (url.pathname === '/status') {
      return await handleStatus(env);
    }

    if (url.pathname === '/internal/handle-message' && request.method === 'POST') {
      return await handleInternalMessage(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const id = env.MATRIX_SYNC.idFromName('default');
    const stub = env.MATRIX_SYNC.get(id);

    try {
      await stub.fetch(new Request('http://internal/sync'));
    } catch (error) {
      console.error('Scheduled sync error:', error);
    }
  },
};

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const kvStorage = new KVStorage(env.KV);

    const matrixClient = new MatrixClient(env.MATRIX_HOMESERVER);

    if (!env.MATRIX_USER_ID || !env.MATRIX_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'MATRIX_USER_ID and MATRIX_PASSWORD must be set' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const username = env.MATRIX_USER_ID.replace('@', '').split(':')[0];
    const loginResponse = await matrixClient.login(username, env.MATRIX_PASSWORD);

    await kvStorage.setAccessToken(
      loginResponse.access_token,
      loginResponse.user_id,
      loginResponse.device_id
    );

    if (env.BOT_ADMIN_USERS) {
      const admins = env.BOT_ADMIN_USERS.split(',').map((u) => u.trim());
      await kvStorage.setAdminList(admins);
    }

    const defaultProvider = {
      name: 'openai',
      baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: env.OPENAI_API_KEY,
      models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      defaultModel: env.DEFAULT_MODEL || 'gpt-4',
    };

    await kvStorage.setProvider(defaultProvider);

    return new Response(
      JSON.stringify({
        status: 'logged_in',
        user_id: loginResponse.user_id,
        device_id: loginResponse.device_id,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleStart(env: Env): Promise<Response> {
  try {
    const id = env.MATRIX_SYNC.idFromName('default');
    const stub = env.MATRIX_SYNC.get(id);

    const response = await stub.fetch(new Request('http://internal/start'));
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleStop(env: Env): Promise<Response> {
  try {
    const id = env.MATRIX_SYNC.idFromName('default');
    const stub = env.MATRIX_SYNC.get(id);

    const response = await stub.fetch(new Request('http://internal/stop'));
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleStatus(env: Env): Promise<Response> {
  try {
    const id = env.MATRIX_SYNC.idFromName('default');
    const stub = env.MATRIX_SYNC.get(id);

    const response = await stub.fetch(new Request('http://internal/status'));
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleInternalMessage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const data = await request.json() as { roomId: string; event: any };
    const { roomId, event } = data;

    const messageHandler = new MessageHandler(env);
    await messageHandler.initialize();

    ctx.waitUntil(messageHandler.handleMessage(roomId, event));

    return new Response(JSON.stringify({ status: 'processing' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error handling internal message:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
