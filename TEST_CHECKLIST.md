# Matrix Bot Testing Checklist

## Pre-flight Checks

1. **Verify Bot is Running**
   ```bash
   curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/status
   ```
   Expected: `{"isRunning":true,"syncToken":"..."}`

2. **Check Secrets**
   ```bash
   wrangler secret list
   ```
   Required secrets:
   - `MATRIX_USER_ID` (e.g., `@botuser:oi6.uk`)
   - `MATRIX_PASSWORD`
   - `OPENAI_API_KEY`

   Optional:
   - `OPENAI_BASE_URL`
   - `BOT_ADMIN_USERS` (if set, only these users can use the bot)
   - `DEFAULT_MODEL`

## Step-by-Step Testing

### Step 1: Invite Bot to Room

In your Matrix client:
```
/invite @your-bot-user-id:oi6.uk
```

**Important**: The bot accepts invites automatically every 2 minutes (via cron).
Wait 2-3 minutes after inviting before testing.

### Step 2: Verify Bot Joined

Check if the bot appears in the room member list.

### Step 3: Send a Test Message

**✅ Correct message formats:**

```
@your-bot-user-id:oi6.uk hello
```

```
@your-bot-user-id:oi6.uk what is the weather like?
```

```
!help
```

**❌ Incorrect formats (bot will NOT respond):**

```
hello
```

```
hey bot, how are you?
```

The bot MUST be mentioned with its full user ID, or the message must start with `!`.

### Step 4: Check Response Time

- Bot checks for new messages every 2 minutes (cron schedule)
- Response should appear within 2-3 minutes
- If no response after 5 minutes, check logs

### Step 5: Review Cloudflare Logs

1. Go to https://dash.cloudflare.com
2. Navigate to: Workers & Pages → matrix-chatgpt-bot
3. Click "Logs" tab
4. Look for:
   - `"Joined room: !..."`
   - `"Processing message from @sender:..."`
   - Any error messages

## Common Issues

### Bot Not Responding

**Issue**: Bot doesn't reply to messages

**Possible causes:**

1. **Message format incorrect**
   - Solution: Include full bot user ID: `@botname:oi6.uk hello`

2. **User not in allowed list**
   - Check if `BOT_ADMIN_USERS` secret is set
   - If set, only listed users can use bot
   - Solution: Add yourself to the list or remove the secret

3. **Bot hasn't joined room yet**
   - Wait 2-3 minutes after inviting
   - Check Cloudflare logs for "Joined room" message

4. **API key issues**
   - Invalid or expired `OPENAI_API_KEY`
   - Check logs for API errors

5. **Cron not triggering**
   - Verify in Cloudflare dashboard: Workers → Triggers → Cron Triggers
   - Should show: `*/2 * * * *` (every 2 minutes)

### Bot Not Joining Room

**Issue**: Bot doesn't accept invite

**Solution:**
- Wait 2-3 minutes (cron runs every 2 minutes)
- Check logs for errors
- Verify bot has valid authentication
- Try re-inviting

### Authentication Errors

**Issue**: Bot fails to login

**Solution:**
```bash
# Re-login
curl -X POST https://matrix-chatgpt-bot.facilis-velox.workers.dev/login

# Check result
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/status
```

## Quick Debug Commands

```bash
# Check health
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/health

# Check status
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/status

# Force login
curl -X POST https://matrix-chatgpt-bot.facilis-velox.workers.dev/login

# Start sync (if stopped)
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/start

# Stop sync (for debugging)
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/stop
```

## Example Working Flow

1. Deploy bot: `wrangler deploy`
2. Login: `curl -X POST https://your-worker.workers.dev/login`
3. Start: `curl https://your-worker.workers.dev/start`
4. In Matrix: `/invite @botuser:oi6.uk`
5. Wait 2-3 minutes
6. Send: `@botuser:oi6.uk hello!`
7. Wait up to 2 minutes for response

## Monitoring

Watch logs in real-time:
```bash
wrangler tail
```

Or use Cloudflare dashboard for historical logs.

## Testing Commands

Try these commands once the bot is working:

```
!help
!providers
!models
!status
@botuser:oi6.uk tell me a joke
@botuser:oi6.uk explain quantum computing
```

## Need Help?

If bot still not responding after following all steps:

1. Check Cloudflare Workers logs for errors
2. Verify all secrets are set correctly
3. Ensure MATRIX_HOMESERVER matches your user domain
4. Try deleting and re-deploying: `wrangler delete && wrangler deploy`
