#!/bin/bash

echo "================================================"
echo "Matrix ChatGPT Bot - Initial Setup"
echo "================================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: Wrangler is not installed."
    echo "Please install it first: npm install -g wrangler"
    exit 1
fi

echo "✅ Wrangler is installed"
echo ""

# Check if wrangler.toml exists
if [ -f "wrangler.toml" ]; then
    echo "⚠️  Warning: wrangler.toml already exists."
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy template
echo "📋 Creating wrangler.toml from template..."
cp wrangler.toml.example wrangler.toml
echo "✅ wrangler.toml created"
echo ""

# Login to Cloudflare
echo "🔐 Logging in to Cloudflare..."
wrangler login

echo ""
echo "================================================"
echo "Step 1: Create KV Namespaces"
echo "================================================"
echo ""

echo "Creating production KV namespace..."
KV_OUTPUT=$(wrangler kv:namespace create "KV" 2>&1)
echo "$KV_OUTPUT"
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' | head -1)

echo ""
echo "Creating preview KV namespace..."
KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "KV" --preview 2>&1)
echo "$KV_PREVIEW_OUTPUT"
KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+' | head -1)

if [ -n "$KV_ID" ] && [ -n "$KV_PREVIEW_ID" ]; then
    echo ""
    echo "✅ KV namespaces created successfully"

    # Update wrangler.toml with KV IDs
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/YOUR_KV_NAMESPACE_ID_HERE/$KV_ID/" wrangler.toml
        sed -i '' "s/YOUR_PREVIEW_KV_NAMESPACE_ID_HERE/$KV_PREVIEW_ID/" wrangler.toml
    else
        # Linux
        sed -i "s/YOUR_KV_NAMESPACE_ID_HERE/$KV_ID/" wrangler.toml
        sed -i "s/YOUR_PREVIEW_KV_NAMESPACE_ID_HERE/$KV_PREVIEW_ID/" wrangler.toml
    fi

    echo "✅ wrangler.toml updated with KV IDs"
else
    echo "⚠️  Warning: Could not extract KV IDs automatically"
    echo "Please update wrangler.toml manually with the IDs shown above"
fi

echo ""
echo "================================================"
echo "Step 2: Create R2 Buckets"
echo "================================================"
echo ""

echo "Creating production R2 bucket..."
wrangler r2 bucket create matrix-bot-storage

echo ""
echo "Creating preview R2 bucket..."
wrangler r2 bucket create matrix-bot-storage-preview

echo ""
echo "✅ R2 buckets created successfully"

echo ""
echo "================================================"
echo "Step 3: Configure Secrets"
echo "================================================"
echo ""
echo "Now you need to set up your secrets. Run these commands:"
echo ""
echo "wrangler secret put MATRIX_USER_ID"
echo "wrangler secret put MATRIX_PASSWORD"
echo "wrangler secret put OPENAI_API_KEY"
echo "wrangler secret put OPENAI_BASE_URL    # Optional"
echo "wrangler secret put BOT_ADMIN_USERS    # Optional"
echo "wrangler secret put DEFAULT_MODEL      # Optional"
echo ""
read -p "Do you want to set secrets now? (Y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Skipping secrets setup. You can set them later."
else
    echo ""
    echo "Setting MATRIX_USER_ID..."
    wrangler secret put MATRIX_USER_ID

    echo ""
    echo "Setting MATRIX_PASSWORD..."
    wrangler secret put MATRIX_PASSWORD

    echo ""
    echo "Setting OPENAI_API_KEY..."
    wrangler secret put OPENAI_API_KEY

    echo ""
    read -p "Do you want to set a custom OPENAI_BASE_URL? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler secret put OPENAI_BASE_URL
    fi

    echo ""
    read -p "Do you want to set BOT_ADMIN_USERS? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler secret put BOT_ADMIN_USERS
    fi

    echo ""
    read -p "Do you want to set a DEFAULT_MODEL? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler secret put DEFAULT_MODEL
    fi
fi

echo ""
echo "================================================"
echo "Setup Complete! 🎉"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Review your wrangler.toml configuration"
echo "2. Run 'npm install' if you haven't already"
echo "3. Deploy: 'wrangler deploy'"
echo "4. Initialize bot:"
echo "   curl -X POST https://your-worker.workers.dev/login"
echo "   curl https://your-worker.workers.dev/start"
echo ""
echo "For more information, see README.md"
echo ""
