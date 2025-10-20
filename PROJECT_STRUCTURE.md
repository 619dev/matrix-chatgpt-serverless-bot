# Project Structure

## Directory Layout

```
matrix-chatgpt-bot/
├── src/
│   ├── index.ts                    # Worker entry point
│   ├── types.ts                    # TypeScript type definitions
│   ├── matrix/
│   │   └── client.ts              # Matrix Client-Server API client
│   ├── ai/
│   │   └── client.ts              # AI API client (OpenAI-compatible)
│   ├── storage/
│   │   ├── kv.ts                  # KV storage abstraction
│   │   └── r2.ts                  # R2 storage abstraction
│   ├── durable-objects/
│   │   └── MatrixSync.ts          # Durable Object for Matrix sync
│   └── bot/
│       ├── commands.ts            # Command handler
│       └── handler.ts             # Message handler
├── wrangler.toml                   # Cloudflare Workers configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Node.js dependencies
├── README.md                       # Main documentation
├── DEPLOYMENT.md                   # Deployment guide
├── QUICKSTART.md                   # Quick start guide
└── .env.example                    # Environment variables template
```

## Core Components

### Worker (src/index.ts)

Main entry point for Cloudflare Workers. Handles:
- HTTP routes (`/login`, `/start`, `/stop`, `/status`)
- Scheduled triggers (cron)
- Request routing to Durable Objects

### Matrix Client (src/matrix/client.ts)

Implements Matrix Client-Server API:
- Authentication (`login`)
- Sync loop (`sync`)
- Send messages (`sendMessage`)
- Room management (`joinRoom`, `leaveRoom`)
- Typing indicators and read receipts

### AI Client (src/ai/client.ts)

OpenAI-compatible API client:
- Chat completions
- Streaming support
- Custom base URL support
- Multiple provider support

### Storage Layer

#### KV Storage (src/storage/kv.ts)

Manages configuration and session data:
- Auth tokens
- Sync tokens
- Room configurations
- User settings
- Provider configurations
- Admin lists

#### R2 Storage (src/storage/r2.ts)

Manages large data:
- Conversation history
- Message logs
- Images
- File uploads
- Configuration backups

### Durable Object (src/durable-objects/MatrixSync.ts)

Maintains Matrix sync state:
- Persistent sync loop
- Alarm-based scheduling
- Event processing
- Message routing

### Bot Logic

#### Command Handler (src/bot/commands.ts)

Processes bot commands:
- `!help` - Show help
- `!reset` - Clear history
- `!provider` - Manage providers
- `!model` - Set model
- Admin commands

#### Message Handler (src/bot/handler.ts)

Core bot logic:
- Message processing
- Context management
- AI response generation
- Error handling

## Data Flow

### Message Flow

```
Matrix Server
    ↓
Matrix Sync (Durable Object)
    ↓
Message Handler
    ↓
[Command?] → Command Handler → Response
    ↓
[Chat?] → Load Context (R2) → AI Client → Response
    ↓
Matrix Server
```

### Configuration Flow

```
Environment Variables → KV Storage
    ↓
Provider Config (KV)
    ↓
Room Config (KV)
    ↓
AI Client
```

### Storage Strategy

**KV**: Fast, globally distributed
- Configurations
- Tokens
- Session data
- Metadata

**R2**: Large objects
- Conversation history
- Logs
- Files
- Backups

**Durable Objects**: Stateful coordination
- Sync state
- Connection management
- Event sequencing

## API Endpoints

### Public Endpoints

- `GET /` - Health check
- `GET /health` - Status
- `POST /login` - Matrix login
- `GET /start` - Start sync
- `GET /stop` - Stop sync
- `GET /status` - Sync status

### Internal Endpoints

- `POST /internal/handle-message` - Message processing (used by Durable Object)

## Configuration Files

### wrangler.toml

Defines:
- Worker name and entry point
- KV namespace bindings
- R2 bucket bindings
- Durable Object bindings
- Cron triggers
- Environment variables

### tsconfig.json

TypeScript compiler options:
- Target: ES2021
- Module: ES2022
- Strict mode enabled
- Workers types

### package.json

Dependencies:
- `@cloudflare/workers-types` - TypeScript types
- `typescript` - TypeScript compiler
- `wrangler` - Cloudflare Workers CLI

## Key Features

### Multi-Provider Support

Bot can use any OpenAI-compatible API:
- Official OpenAI
- Azure OpenAI
- OpenRouter
- Local models (vLLM, Ollama, LocalAI)
- Custom endpoints

### Room Isolation

Each room has independent:
- Conversation history
- Provider/model settings
- System prompts
- Configuration

### Admin Controls

Admin-only commands:
- Add/remove providers
- Set global configuration
- View statistics
- Manage users

### Scalability

Cloudflare's global network:
- Edge compute in 200+ cities
- Low latency worldwide
- Auto-scaling
- DDoS protection

## Development Workflow

### Local Development

```bash
npm run dev          # Start local dev server
wrangler tail        # Stream logs
```

### Type Checking

```bash
npm run build        # TypeScript compilation
```

### Deployment

```bash
wrangler deploy      # Deploy to production
```

## Testing Strategy

### Manual Testing

1. Deploy to preview environment
2. Test commands in Matrix room
3. Verify logs in Cloudflare dashboard
4. Check KV/R2 data

### Integration Testing

1. Test Matrix sync
2. Test AI responses
3. Test provider switching
4. Test error handling

## Security Considerations

### Secrets Management

All sensitive data stored as Cloudflare secrets:
- Matrix credentials
- API keys
- Never in code or version control

### Access Control

Multiple layers:
- Admin whitelist
- User whitelist
- Room-level permissions

### Data Privacy

- No logging of message content
- Conversation history encrypted in R2
- Credentials never exposed in logs

## Performance Optimization

### KV Caching

Hot data cached globally:
- Provider configs
- Room settings
- Recent conversations

### R2 Batching

Batch operations to reduce:
- Request count
- Latency
- Costs

### Durable Object Alarms

Efficient sync scheduling:
- No polling when idle
- Automatic wake-up
- Resource conservation

## Monitoring

### Logs

```bash
wrangler tail        # Real-time logs
```

### Metrics

Cloudflare dashboard:
- Request count
- Error rate
- Duration
- KV/R2 operations

### Debugging

Check:
1. Worker logs
2. Durable Object state
3. KV data
4. R2 objects

## Future Enhancements

Potential additions:
- E2E encryption support
- Image generation
- Voice messages
- Multi-bot support
- Enhanced analytics
- Web UI dashboard
