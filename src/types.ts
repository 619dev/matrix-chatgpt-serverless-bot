export interface Env {
  KV: KVNamespace;
  R2: R2Bucket;
  MATRIX_SYNC: DurableObjectNamespace;
  MATRIX_HOMESERVER: string;
  MATRIX_USER_ID: string;
  MATRIX_PASSWORD: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL?: string;
  BOT_ADMIN_USERS?: string;
  DEFAULT_MODEL?: string;
}

export interface MatrixLoginResponse {
  access_token: string;
  device_id: string;
  user_id: string;
  home_server?: string;
}

export interface MatrixSyncResponse {
  next_batch: string;
  rooms?: {
    join?: {
      [roomId: string]: {
        timeline?: {
          events: MatrixEvent[];
        };
        state?: {
          events: MatrixEvent[];
        };
      };
    };
    invite?: {
      [roomId: string]: any;
    };
  };
}

export interface MatrixEvent {
  type: string;
  sender: string;
  content: any;
  event_id: string;
  origin_server_ts: number;
  room_id?: string;
}

export interface AIProvider {
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
}

export interface RoomConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationHistory {
  roomId: string;
  messages: ConversationMessage[];
  lastUpdated: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
