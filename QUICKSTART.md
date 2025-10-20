# Quick Start Guide

Get your Matrix ChatGPT bot running in 5 minutes!

## Prerequisites

- Cloudflare account (free)
- Matrix account
- OpenAI API key

## 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

## 2. Setup Project

```bash
npm install
```

## 3. Create Cloudflare Resources

```bash
# Create KV namespace
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview

# Create R2 bucket
wrangler r2 bucket create matrix-bot-storage
```

Copy the KV namespace IDs and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID_HERE"
preview_id = "YOUR_PREVIEW_KV_ID_HERE"
```

## 4. Configure Secrets

```bash
# Matrix account
wrangler secret put MATRIX_USER_ID
# Example: @mybot:matrix.org

wrangler secret put MATRIX_PASSWORD
# Your bot password

# OpenAI
wrangler secret put OPENAI_API_KEY
# Your OpenAI API key (sk-...)

# Optional: Custom API endpoint
wrangler secret put OPENAI_BASE_URL
# Default: https://api.openai.com/v1

# Admin users
wrangler secret put BOT_ADMIN_USERS
# Example: @admin:matrix.org
```

## 5. Deploy

```bash
wrangler deploy
```

## 6. Initialize Bot

```bash
# Replace with your actual worker URL
export BOT_URL="https://matrix-chatgpt-bot.yourname.workers.dev"

# Login to Matrix
curl -X POST $BOT_URL/login

# Start sync
curl $BOT_URL/start

# Check status
curl $BOT_URL/status
```

## 7. Test in Matrix

1. Create or join a Matrix room
2. Invite your bot: `/invite @mybot:matrix.org`
3. Send a message: `@mybot:matrix.org hello!`
4. The bot should respond!

## Using Commands

Try these commands:

```
!help                    # Show all commands
!provider list          # List AI providers
!reset                  # Clear conversation history
```

## Adding Custom API Providers

### Example: OpenRouter

```
!addprovider openrouter https://openrouter.ai/api/v1 YOUR_KEY gpt-4 claude-3-opus
!provider set openrouter
```

### Example: Local Model

```
!addprovider local http://localhost:8000/v1 none llama-2-7b
!provider set local
```

## Troubleshooting

**Bot doesn't respond?**

```bash
# Check status
curl $BOT_URL/status

# Check logs
wrangler tail

# Restart sync
curl $BOT_URL/start
```

**Need to re-login?**

```bash
curl -X POST $BOT_URL/login
curl $BOT_URL/start
```

## What's Next?

- Read [README.md](README.md) for full documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Configure advanced features in Matrix rooms

## Support

For issues:
1. Check logs: `wrangler tail`
2. Review documentation
3. Open a GitHub issue

Enjoy your Matrix ChatGPT bot! 🤖
