# Contributing Guide

## For Public GitHub Repository

This project is designed to be safely shared on GitHub without exposing sensitive credentials.

## Important Files

### Files That SHOULD Be Committed

- `wrangler.toml.example` - Template configuration
- `.env.example` - Environment variables template
- All source code in `src/`
- Documentation (`*.md`)
- `package.json`, `tsconfig.json`
- `.gitignore`
- `setup.sh`

### Files That SHOULD NOT Be Committed

- `wrangler.toml` - Contains your KV/R2 IDs (gitignored)
- `.env` - Contains secrets (gitignored)
- `.dev.vars` - Local development secrets (gitignored)
- `node_modules/` - Dependencies (gitignored)
- `.wrangler/` - Build artifacts (gitignored)

## Before Pushing to GitHub

### 1. Verify No Secrets Are Included

```bash
# Check for potential secrets
git grep -i "api.key\|password\|secret" -- ':!*.example' ':!*.md'

# Make sure these files are gitignored
git status --ignored
```

### 2. Double Check .gitignore

Ensure these patterns are in `.gitignore`:

```gitignore
wrangler.toml
.env
.dev.vars
node_modules/
.wrangler/
```

### 3. Clean Up

```bash
# Remove your local wrangler.toml if it exists
rm wrangler.toml

# Remove any .env files
rm .env

# Ensure only safe files are staged
git add -A
git status
```

### 4. Initial Commit

```bash
git init
git add .
git commit -m "Initial commit: Matrix ChatGPT Bot"
```

### 5. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (public or private)
3. Do NOT initialize with README (we already have one)

### 6. Push to GitHub

```bash
git remote add origin https://github.com/yourusername/matrix-chatgpt-bot.git
git branch -M main
git push -u origin main
```

## For Users Cloning from GitHub

After cloning, users should:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot

# 2. Install dependencies
npm install

# 3. Run setup script (recommended)
./setup.sh

# OR manually:
# 3a. Copy configuration template
cp wrangler.toml.example wrangler.toml

# 3b. Create Cloudflare resources
wrangler login
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
wrangler r2 bucket create matrix-bot-storage
wrangler r2 bucket create matrix-bot-storage-preview

# 3c. Update wrangler.toml with your IDs

# 3d. Set secrets
wrangler secret put MATRIX_USER_ID
wrangler secret put MATRIX_PASSWORD
wrangler secret put OPENAI_API_KEY

# 4. Deploy
wrangler deploy
```

## Development Workflow

### Making Changes

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes to code

# 3. Test locally
npm run build
wrangler dev

# 4. Commit changes
git add src/
git commit -m "Add: description of changes"

# 5. Push to GitHub
git push origin feature/my-feature

# 6. Create Pull Request on GitHub
```

### Local Development with Secrets

Use `.dev.vars` for local development (gitignored):

```bash
# Create .dev.vars
cat > .dev.vars << EOF
MATRIX_USER_ID=@testbot:matrix.org
MATRIX_PASSWORD=test_password
OPENAI_API_KEY=sk-test-key
OPENAI_BASE_URL=https://api.openai.com/v1
EOF

# Run local dev server
wrangler dev
```

**Note**: `.dev.vars` is automatically gitignored and will never be committed.

## Security Best Practices

### ✅ DO

- Use `wrangler secret` for production secrets
- Use `.dev.vars` for local development
- Keep `wrangler.toml` in `.gitignore`
- Use `wrangler.toml.example` as template
- Review changes before committing: `git diff`
- Use `git status --ignored` to verify gitignored files

### ❌ DON'T

- Never commit `wrangler.toml` with real IDs
- Never commit `.env` or `.dev.vars`
- Never hardcode API keys in source code
- Never commit KV namespace IDs or R2 bucket names with sensitive data
- Never log sensitive information

## Common Issues

### Issue: Accidentally Committed Secrets

If you accidentally commit secrets:

```bash
# 1. Remove the file from git history
git rm --cached wrangler.toml

# 2. Add to .gitignore if not already there
echo "wrangler.toml" >> .gitignore

# 3. Commit the removal
git commit -m "Remove sensitive configuration file"

# 4. Rotate all exposed secrets immediately!
wrangler secret put MATRIX_PASSWORD
wrangler secret put OPENAI_API_KEY
```

### Issue: Cannot Push to GitHub

If git prevents pushing due to large files:

```bash
# Check for large files
git ls-files | xargs ls -lh | sort -k5 -hr | head

# Remove if accidentally added
git rm --cached large-file
git commit --amend
```

## Continuous Integration (Optional)

Example GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          wranglerVersion: '3.x'
```

**Note**: You need to set `CLOUDFLARE_API_TOKEN` in GitHub repository secrets.

## Questions?

If you have questions about contributing:
1. Check existing issues on GitHub
2. Review documentation in `README.md`
3. Open a new issue with your question

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
