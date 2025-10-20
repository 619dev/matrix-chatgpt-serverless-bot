# Matrix ChatGPT Bot

A serverless Matrix bot powered by OpenAI ChatGPT, deployed on Cloudflare Workers with KV and R2 storage.

## Features

- 🤖 **AI-Powered Conversations**: Chat with OpenAI models in Matrix rooms
- 🔌 **Custom API Providers**: Support for custom OpenAI-compatible APIs (Azure, OpenRouter, local models, etc.)
- 💾 **Persistent Storage**: Conversation history stored in Cloudflare R2
- ⚡ **Serverless**: Runs entirely on Cloudflare Workers with Durable Objects
- 🌐 **Global Edge Network**: Low latency responses from Cloudflare's global network
- 🔒 **Access Control**: Admin and whitelist support
- 📝 **Rich Commands**: Multiple commands for configuration and management

## Architecture

- **Cloudflare Workers**: Serverless compute
- **Durable Objects**: Matrix sync state management
- **KV Storage**: Configuration and session data
- **R2 Storage**: Conversation history and logs
- **Matrix Protocol**: Client-Server API integration
- **OpenAI API**: Chat completions (customizable endpoint)

## Prerequisites

1. Cloudflare account with Workers enabled (free tier supported)
2. Matrix account (any homeserver)
3. OpenAI API key or compatible API endpoint

**Note**: This bot works on Cloudflare's free tier! It uses `new_sqlite_classes` for Durable Objects, which is compatible with free plans.

## Setup

### Option 1: Automated Setup (Recommended)

```bash
# Clone from GitHub
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot

# Install dependencies
npm install

# Run automated setup script
./setup.sh
```

The setup script will:
- Create KV namespaces
- Create R2 buckets
- Generate `wrangler.toml` from template
- Guide you through setting secrets

### Option 2: Manual Setup

#### 1. Clone and Install

```bash
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot
npm install
```

#### 2. Create wrangler.toml

```bash
cp wrangler.toml.example wrangler.toml
```

#### 3. Configure Cloudflare

Login to Cloudflare:
```bash
wrangler login
```

Create KV namespace:
```bash
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
```

Create R2 bucket:
```bash
wrangler r2 bucket create matrix-bot-storage
wrangler r2 bucket create matrix-bot-storage-preview
```

Update `wrangler.toml` with your namespace IDs.

#### 4. Set Secrets

```bash
wrangler secret put MATRIX_USER_ID
# Enter: @yourbotuser:matrix.org

wrangler secret put MATRIX_PASSWORD
# Enter: your_bot_password

wrangler secret put OPENAI_API_KEY
# Enter: sk-your-api-key

wrangler secret put OPENAI_BASE_URL
# Enter: https://api.openai.com/v1 (or custom URL)

wrangler secret put BOT_ADMIN_USERS
# Enter: @admin1:matrix.org,@admin2:matrix.org
```

#### 5. Deploy

```bash
wrangler deploy
```

#### 6. Initialize Bot

```bash
# Login to Matrix
curl -X POST https://your-worker.workers.dev/login

# Start sync loop
curl https://your-worker.workers.dev/start
```

## Usage

### Basic Commands

Mention the bot or use commands starting with `!`:

- `!help` - Show available commands
- `!gpt <message>` - Chat with GPT (anyone can use, no mention needed)
- `!reset` - Clear conversation history
- `!provider` - Show current AI provider
- `!provider list` - List all available providers
- `!provider set <name>` - Switch to a different provider
- `!model <name>` - Set AI model for current room

### Admin Commands

- `!addprovider <name> <baseURL> <apiKey> [models...]` - Add new AI provider
- `!delprovider <name>` - Remove AI provider
- `!seturl <baseURL>` - Set default OpenAI base URL
- `!stats` - Show bot statistics

### Chatting with the Bot

There are three ways to interact with the bot:

#### 1. Using !gpt command (Easiest, no mention needed)

```
!gpt what is the capital of France?
```

```
!gpt tell me a joke
```

#### 2. Mentioning the bot

```
@botuser:matrix.org what is the capital of France?
```

#### 3. Using other commands

```
!help
!reset
!provider list
```

## Custom API Providers

The bot supports any OpenAI-compatible API. Here are some examples:

### Azure OpenAI

```bash
!addprovider azure https://your-resource.openai.azure.com/openai/deployments/your-deployment YOUR_AZURE_KEY gpt-4 gpt-35-turbo
!provider set azure
```

### OpenRouter

```bash
!addprovider openrouter https://openrouter.ai/api/v1 YOUR_OPENROUTER_KEY gpt-4 claude-3-opus
!provider set openrouter
```

### Local Models (vLLM, LocalAI, Ollama)

```bash
!addprovider local http://localhost:8000/v1 none llama-2-7b mistral-7b
!provider set local
```

### Together AI

```bash
!addprovider together https://api.together.xyz/v1 YOUR_TOGETHER_KEY meta-llama/Llama-2-70b-chat-hf
!provider set together
```

## Configuration

### Room-Level Configuration

Each room can have its own configuration stored in KV:

```typescript
{
  provider: "openai",      // AI provider name
  model: "gpt-4",          // Model name
  temperature: 0.7,        // Response randomness (0-2)
  maxTokens: 2000,         // Max response length
  systemPrompt: "..."      // Custom system prompt
}
```

### Global Configuration

Global settings stored in KV at `config:global`:

```typescript
{
  defaultProvider: "openai",
  defaultModel: "gpt-4",
  maxContextMessages: 20   // Number of messages to keep in context
}
```

## Storage Structure

### KV Keys

- `sync:token` - Matrix sync token
- `auth:access_token` - Matrix access token
- `auth:user_id` - Bot user ID
- `auth:device_id` - Matrix device ID
- `room:config:{roomId}` - Room-specific configuration
- `user:settings:{userId}` - User preferences
- `provider:{name}` - AI provider configuration
- `config:global` - Global bot configuration
- `config:admins` - List of admin users
- `config:whitelist` - List of allowed users

### R2 Paths

- `conversations/{roomId}/history.json` - Conversation history
- `logs/{date}/{roomId}/{timestamp}.json` - Message logs
- `images/{messageId}.{ext}` - Generated images
- `uploads/{userId}/{fileId}` - User uploads
- `config/backup-{timestamp}.json` - Configuration backups

## Development

### Local Development

```bash
npm run dev
```

### Type Checking

```bash
npm run build
```

## Testing the Bot

See [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for a complete step-by-step guide.

**Quick test:**

1. Invite bot in Matrix: `/invite @your-bot-user-id:oi6.uk`
2. Wait 2-3 minutes for bot to accept
3. Try the `!gpt` command: `!gpt hello!`
4. Or mention the bot: `@your-bot-user-id:oi6.uk hello!`
5. Or use help: `!help`

**Important**: Bot responds to:
- `!gpt <message>` - Easiest way, no mention needed
- `@bot-user-id message` - Traditional mention
- `!command` - Other bot commands

## API Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /login` - Authenticate with Matrix
- `GET /start` - Start sync loop
- `GET /stop` - Stop sync loop
- `GET /status` - Get sync status

## Troubleshooting

### Durable Objects Error (Free Plan)

If you get an error about `new_classes` migration:

```
In order to use Durable Objects with a free plan, you must create a namespace using a `new_sqlite_classes` migration.
```

Make sure your `wrangler.toml` uses `new_sqlite_classes` instead of `new_classes`:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatrixSync"]  # Use this for free plan
```

### KV Binding Name Error

The KV binding name in `wrangler.toml` **must** be `"KV"` (uppercase):

```toml
[[kv_namespaces]]
binding = "KV"  # Must match the code
id = "your_id_here"
```

The namespace title (shown in dashboard) can be anything, but the binding must be "KV".

### Bot doesn't respond

1. Check if sync is running: `curl https://your-worker.workers.dev/status`
2. Check logs in Cloudflare dashboard
3. Verify authentication: Check KV for `auth:access_token`
4. Make sure the bot is invited to the room

### API errors

1. Verify API key is correct
2. Check base URL format (should not end with `/`)
3. Test API endpoint directly with curl
4. Check Cloudflare Workers logs

### Sync loop stops

1. Restart sync: `curl https://your-worker.workers.dev/start`
2. Check if authentication expired
3. Re-login: `curl -X POST https://your-worker.workers.dev/login`

## Limitations

- **KV Write Limits**: KV has a limit of 1 write per second per key
- **Request Timeout**: Workers timeout after 30 seconds for standard plan
- **Memory**: Workers have 128MB memory limit
- **R2 Operations**: Free tier includes 1M requests/month

## Security

- All API keys stored as Cloudflare secrets
- Admin commands restricted to configured admins
- Optional user whitelist for access control
- No credentials logged or exposed

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Credits

Inspired by:
- [ChatGPT-Telegram-Workers](https://github.com/TBXark/ChatGPT-Telegram-Workers)
- [matrix_chatgpt_bot](https://github.com/hibobmaster/matrix_chatgpt_bot)