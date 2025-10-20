# Deployment Guide

English | [简体中文](DEPLOYMENT.zh-CN.md)

## Step-by-Step Deployment

### Prerequisites

1. Install Node.js and npm
2. Install Wrangler CLI: `npm install -g wrangler`
3. Cloudflare account (free tier works)
4. Matrix account
5. OpenAI API key or alternative

### Step 1: Cloudflare Setup

#### Login to Cloudflare

```bash
wrangler login
```

#### Create KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "KV"

# Preview namespace
wrangler kv:namespace create "KV" --preview
```

This will output something like:

```
{ binding = "KV", id = "your_namespace_id" }
```

Save these IDs for the next step.

#### Create R2 Bucket

```bash
wrangler r2 bucket create matrix-bot-storage
```

### Step 2: Configure wrangler.toml

Edit `wrangler.toml` and update:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your_production_kv_id"        # Replace with your KV ID
preview_id = "your_preview_kv_id"    # Replace with your preview KV ID

[[r2_buckets]]
binding = "R2"
bucket_name = "matrix-bot-storage"
```

### Step 3: Set Environment Secrets

```bash
# Matrix credentials
wrangler secret put MATRIX_USER_ID
# Enter: @yourbotuser:matrix.org

wrangler secret put MATRIX_PASSWORD
# Enter: your_secure_password

# OpenAI credentials
wrangler secret put OPENAI_API_KEY
# Enter: sk-your-openai-api-key

# Optional: Custom API endpoint
wrangler secret put OPENAI_BASE_URL
# Enter: https://api.openai.com/v1

# Admin users (comma-separated)
wrangler secret put BOT_ADMIN_USERS
# Enter: @admin1:matrix.org,@admin2:matrix.org

# Default model
wrangler secret put DEFAULT_MODEL
# Enter: gpt-4
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Deploy to Cloudflare

```bash
wrangler deploy
```

After deployment, you'll see:

```
Published matrix-chatgpt-bot (0.01 sec)
  https://matrix-chatgpt-bot.yourname.workers.dev
```

### Step 6: Initialize the Bot

#### Login to Matrix

```bash
curl -X POST https://matrix-chatgpt-bot.yourname.workers.dev/login
```

Expected response:

```json
{
  "status": "logged_in",
  "user_id": "@yourbotuser:matrix.org",
  "device_id": "ABCDEFGHIJ"
}
```

#### Start Sync Loop

```bash
curl https://matrix-chatgpt-bot.yourname.workers.dev/start
```

Expected response:

```json
{
  "status": "started"
}
```

#### Check Status

```bash
curl https://matrix-chatgpt-bot.yourname.workers.dev/status
```

Expected response:

```json
{
  "isRunning": true,
  "syncToken": "s12345_67890_..."
}
```

### Step 7: Test the Bot

1. Invite the bot to a Matrix room
2. Send a message mentioning the bot:

```
@yourbotuser:matrix.org hello!
```

3. The bot should respond with a greeting.

## Configuration Examples

### Using Azure OpenAI

In your Matrix room, send:

```
!addprovider azure https://your-resource.openai.azure.com/openai/deployments/your-deployment YOUR_AZURE_API_KEY gpt-4 gpt-35-turbo
!provider set azure
```

### Using OpenRouter

```
!addprovider openrouter https://openrouter.ai/api/v1 YOUR_OPENROUTER_KEY gpt-4 claude-3-opus anthropic/claude-3-5-sonnet
!provider set openrouter
```

### Using Local Models

If you have a local model server (vLLM, LocalAI, Ollama):

```
!addprovider local http://your-server:8000/v1 none llama-2-7b mistral-7b
!provider set local
```

## Monitoring and Logs

### View Logs

```bash
wrangler tail
```

### Check KV Data

```bash
# List all keys
wrangler kv:key list --binding KV

# Get a specific key
wrangler kv:key get "sync:token" --binding KV
```

### Check R2 Storage

```bash
wrangler r2 object list matrix-bot-storage
```

## Updating the Bot

After making changes:

```bash
wrangler deploy
```

The bot will continue running with the new code.

## Troubleshooting

### Durable Objects Migration Error

**Error**: `In order to use Durable Objects with a free plan, you must create a namespace using a new_sqlite_classes migration.`

**Solution**: Ensure your `wrangler.toml` uses `new_sqlite_classes`:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatrixSync"]  # Required for Cloudflare free plan
```

If you already deployed with `new_classes`, you may need to:
1. Delete the worker: `wrangler delete`
2. Update `wrangler.toml` to use `new_sqlite_classes`
3. Deploy again: `wrangler deploy`

### Bot doesn't login

1. Check Matrix credentials:
   - Verify username format: `@user:server.org`
   - Password is correct
   - Account is not locked

2. Check Matrix homeserver:
   - Verify `MATRIX_HOMESERVER` in `wrangler.toml`
   - Try accessing the homeserver URL in a browser

### Bot doesn't respond to messages

1. Check sync status:
```bash
curl https://your-worker.workers.dev/status
```

2. If not running, restart:
```bash
curl https://your-worker.workers.dev/start
```

3. Check logs:
```bash
wrangler tail
```

### OpenAI API errors

1. Verify API key is correct
2. Check API balance/quota
3. Test the API directly:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Durable Object errors

If you see Durable Object errors:

1. Check `wrangler.toml` migrations section
2. Re-deploy:
```bash
wrangler deploy
```

### KV/R2 access errors

1. Verify namespace/bucket IDs in `wrangler.toml`
2. Check bindings are correct
3. Ensure account has permissions

## Cost Estimation

With Cloudflare's free tier:

- **Workers**: 100,000 requests/day (free)
- **KV**: 100,000 reads/day, 1,000 writes/day (free)
- **R2**: 10GB storage, 1M operations/month (free)
- **Durable Objects**: 1M requests/month (free)

For typical usage (5-10 rooms, moderate activity):
- **Cost**: $0/month (free tier sufficient)

For heavy usage (50+ rooms, high activity):
- **Workers**: ~$5/month
- **KV**: ~$0.50/month
- **R2**: ~$0.15/month
- **Durable Objects**: ~$5/month
- **Total**: ~$10-15/month

## Security Best Practices

1. **Never commit secrets**: Always use `wrangler secret put`
2. **Use admin whitelist**: Set `BOT_ADMIN_USERS` to restrict admin commands
3. **Enable user whitelist**: Use `!whitelist` command to restrict bot access
4. **Rotate API keys**: Change keys periodically
5. **Monitor logs**: Check for suspicious activity

## Backup and Recovery

### Backup Configuration

The bot automatically backs up configuration to R2 at:
```
config/backup-{timestamp}.json
```

### Manual Backup

```bash
# Backup KV data
wrangler kv:key list --binding KV > kv-backup.json

# Backup R2 data
wrangler r2 object list matrix-bot-storage > r2-backup.json
```

### Restore

```bash
# Restore KV key
wrangler kv:key put "provider:openai" --binding KV < provider.json

# Re-login to Matrix
curl -X POST https://your-worker.workers.dev/login
```

## Advanced Configuration

### Custom Sync Interval

Edit `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes instead of 2
```

### Increase Context Size

In Matrix room:

```
!setconfig maxContextMessages 50
```

### Custom System Prompt

In Matrix room:

```
!setprompt You are a helpful AI assistant specializing in programming and technology.
```

## Production Checklist

- [ ] Secrets configured
- [ ] KV namespace created and configured
- [ ] R2 bucket created and configured
- [ ] Bot logged in to Matrix
- [ ] Sync loop started
- [ ] Admin users configured
- [ ] Default provider configured
- [ ] Bot tested in a room
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Documentation reviewed

## Support

For issues and questions:
- Check logs: `wrangler tail`
- Review documentation: README.md
- Open an issue on GitHub
