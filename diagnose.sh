#!/bin/bash

# Bot Diagnostics Script
# Usage: ./diagnose.sh https://your-worker.workers.dev

if [ -z "$1" ]; then
    echo "Usage: ./diagnose.sh <worker-url>"
    echo "Example: ./diagnose.sh https://matrix-chatgpt-bot.facilis-velox.workers.dev"
    exit 1
fi

BOT_URL="$1"

echo "=========================================="
echo "   Matrix Bot Diagnostics"
echo "=========================================="
echo ""
echo "Bot URL: $BOT_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s "$BOT_URL/health" 2>&1)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Health check passed"
    echo "$HEALTH" | head -5
else
    echo "❌ Health check failed"
    echo "$HEALTH"
fi
echo ""

# Test 2: Check if logged in
echo "2️⃣  Checking authentication status..."
STATUS=$(curl -s "$BOT_URL/status" 2>&1)
if echo "$STATUS" | grep -q "error"; then
    echo "⚠️  Not authenticated or error occurred"
    echo "$STATUS"
    echo ""
    echo "Attempting to login..."
    LOGIN=$(curl -s -X POST "$BOT_URL/login" 2>&1)
    echo "$LOGIN"

    if echo "$LOGIN" | grep -q "error"; then
        echo ""
        echo "❌ Login failed!"
        echo "Please check:"
        echo "  - MATRIX_USER_ID is set correctly (e.g., @botuser:matrix.org)"
        echo "  - MATRIX_PASSWORD is correct"
        echo "  - MATRIX_HOMESERVER matches your user ID domain"
        echo ""
        echo "Check secrets with: wrangler secret list"
        exit 1
    else
        echo "✅ Login successful"
        sleep 2
    fi
else
    echo "✅ Bot is authenticated"
fi
echo ""

# Test 3: Check sync status
echo "3️⃣  Checking sync status..."
STATUS=$(curl -s "$BOT_URL/status" 2>&1)
echo "$STATUS"

if echo "$STATUS" | grep -q '"running":true'; then
    echo "✅ Sync is running"
elif echo "$STATUS" | grep -q '"running":false'; then
    echo "⚠️  Sync is not running"
    echo ""
    echo "Starting sync..."
    START=$(curl -s "$BOT_URL/start" 2>&1)
    echo "$START"

    if echo "$START" | grep -q "started"; then
        echo "✅ Sync started successfully"
    else
        echo "❌ Failed to start sync"
        exit 1
    fi
else
    echo "⚠️  Cannot determine sync status"
fi
echo ""

# Test 4: Check for errors
echo "4️⃣  Checking for errors..."
if echo "$STATUS" | grep -q "error"; then
    echo "❌ Errors detected:"
    echo "$STATUS" | grep "error"
else
    echo "✅ No errors detected"
fi
echo ""

# Test 5: Configuration summary
echo "=========================================="
echo "   Configuration Checklist"
echo "=========================================="
echo ""
echo "Make sure you have completed these steps:"
echo ""
echo "✓ Secrets configured (run: wrangler secret list)"
echo "  - MATRIX_USER_ID"
echo "  - MATRIX_PASSWORD"
echo "  - OPENAI_API_KEY"
echo "  - OPENAI_BASE_URL (optional)"
echo ""
echo "✓ Bot invited to Matrix room"
echo "  - Invite bot: /invite @yourbotuser:matrix.org"
echo "  - Bot should accept invite automatically"
echo ""
echo "✓ Message format to trigger bot:"
echo "  - Direct: @yourbotuser:matrix.org hello"
echo "  - Or in invited room: just type your message"
echo ""

# Test 6: Final status check
echo "=========================================="
echo "   Final Status Check"
echo "=========================================="
echo ""

FINAL_STATUS=$(curl -s "$BOT_URL/status" 2>&1)

if echo "$FINAL_STATUS" | grep -q '"running":true'; then
    echo "✅ Bot is running and ready!"
    echo ""
    echo "Next steps:"
    echo "1. Go to your Matrix client"
    echo "2. Invite bot: /invite @yourbotuser:matrix.org"
    echo "3. Send a message: @yourbotuser:matrix.org hello"
    echo ""
    echo "If bot still doesn't respond:"
    echo "- Check Cloudflare Workers logs in dashboard"
    echo "- Verify bot accepted room invite"
    echo "- Make sure cron trigger is enabled (runs every 2 minutes)"
else
    echo "⚠️  Bot may not be fully operational"
    echo ""
    echo "Current status:"
    echo "$FINAL_STATUS"
    echo ""
    echo "Try these commands manually:"
    echo "  curl -X POST $BOT_URL/login"
    echo "  curl $BOT_URL/start"
    echo "  curl $BOT_URL/status"
fi

echo ""
echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
