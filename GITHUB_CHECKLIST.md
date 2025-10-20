# GitHub Publishing Checklist

Before pushing this project to GitHub, verify the following:

## ✅ Pre-Publish Checklist

### Files to Include (Safe)

- [ ] All source code in `src/` directory
- [ ] `package.json` and `package-lock.json`
- [ ] `tsconfig.json`
- [ ] `wrangler.toml.example` (template only)
- [ ] `.env.example` (template only)
- [ ] `.gitignore` (properly configured)
- [ ] `setup.sh` (automated setup script)
- [ ] All documentation files (`*.md`)
- [ ] LICENSE file

### Files to Exclude (Sensitive)

- [ ] `wrangler.toml` - Must be in `.gitignore`
- [ ] `.env` - Must be in `.gitignore`
- [ ] `.dev.vars` - Must be in `.gitignore`
- [ ] `node_modules/` - Must be in `.gitignore`
- [ ] `.wrangler/` - Must be in `.gitignore`
- [ ] Any files with actual KV/R2 IDs
- [ ] Any files with API keys or passwords

### Verification Steps

1. **Check .gitignore is working:**
   ```bash
   git status --ignored
   ```

2. **Verify no secrets in code:**
   ```bash
   # Search for potential secrets
   git grep -i "sk-" -- ':!*.example' ':!*.md'
   git grep -i "password" -- ':!*.example' ':!*.md'
   git grep -i "api.key" -- ':!*.example' ':!*.md'
   ```

3. **Check what will be committed:**
   ```bash
   git add -A
   git status
   git diff --staged
   ```

4. **Verify wrangler.toml is excluded:**
   ```bash
   # Should show wrangler.toml as ignored
   git status --ignored | grep wrangler.toml
   ```

5. **Check documentation mentions GitHub URL:**
   - Update README.md with your actual GitHub URL
   - Update QUICKSTART.md with your actual GitHub URL
   - Update CONTRIBUTING.md if needed

## 🚀 Publishing Steps

### Initial Setup

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add all files
git add .

# 3. Check status (verify no sensitive files)
git status

# 4. Create initial commit
git commit -m "Initial commit: Matrix ChatGPT Bot with custom API support"
```

### Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `matrix-chatgpt-bot` (or your choice)
3. Description: "Serverless Matrix bot with ChatGPT, deployed on Cloudflare Workers"
4. Choose Public or Private
5. **Do NOT** initialize with README, .gitignore, or license (we have them)
6. Click "Create repository"

### Push to GitHub

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/matrix-chatgpt-bot.git

# Push to main branch
git branch -M main
git push -u origin main
```

### After Publishing

1. **Update Repository Settings on GitHub:**
   - Add topics: `matrix`, `chatgpt`, `cloudflare-workers`, `serverless`, `openai`
   - Add description
   - Add website URL (if you have documentation site)

2. **Create Release:**
   ```bash
   git tag -a v1.0.0 -m "Initial release"
   git push origin v1.0.0
   ```

3. **Update URLs in Documentation:**
   - Replace `yourusername` with your actual GitHub username in:
     - README.md
     - QUICKSTART.md
     - CONTRIBUTING.md

## 📝 Post-Publishing TODO

After publishing to GitHub:

1. **Add GitHub Topics:**
   - matrix
   - chatgpt
   - openai
   - cloudflare-workers
   - serverless
   - durable-objects
   - bot

2. **Optional: Add GitHub Actions:**
   - Create `.github/workflows/deploy.yml` for CI/CD
   - Add Cloudflare API token to GitHub Secrets

3. **Optional: Add Badges to README:**
   ```markdown
   ![Deploy](https://github.com/yourusername/matrix-chatgpt-bot/actions/workflows/deploy.yml/badge.svg)
   ![License](https://img.shields.io/github/license/yourusername/matrix-chatgpt-bot)
   ![Stars](https://img.shields.io/github/stars/yourusername/matrix-chatgpt-bot)
   ```

4. **Test Clone and Setup:**
   - Clone your repo in a new directory
   - Run `./setup.sh`
   - Verify everything works

## ⚠️ Security Reminders

### If You Accidentally Commit Secrets

1. **Immediately rotate ALL secrets:**
   ```bash
   wrangler secret put MATRIX_PASSWORD
   wrangler secret put OPENAI_API_KEY
   ```

2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch wrangler.toml" \
     --prune-empty --tag-name-filter cat -- --all

   git push origin --force --all
   ```

3. **Consider using BFG Repo-Cleaner for larger cleanups:**
   ```bash
   # https://rtyley.github.io/bfg-repo-cleaner/
   ```

### Best Practices

- ✅ Use `wrangler secret` for all sensitive data
- ✅ Keep `wrangler.toml` in `.gitignore`
- ✅ Use `.dev.vars` for local development (also gitignored)
- ✅ Review diffs before committing: `git diff`
- ✅ Use environment variables, never hardcode secrets
- ❌ Never commit API keys or passwords
- ❌ Never commit actual KV/R2 IDs in non-example files
- ❌ Never disable `.gitignore` patterns

## 🔍 Final Verification

Before pushing, run this final check:

```bash
#!/bin/bash

echo "=== Final Security Check ==="
echo ""

# Check for common secret patterns
echo "Checking for API keys..."
git grep -i "sk-" -- ':!*.example' ':!*.md' ':!GITHUB_CHECKLIST.md' && echo "⚠️  Found potential API keys!" || echo "✅ No API keys found"

echo ""
echo "Checking for passwords..."
git grep -i "password.*=" -- ':!*.example' ':!*.md' ':!GITHUB_CHECKLIST.md' && echo "⚠️  Found potential passwords!" || echo "✅ No passwords found"

echo ""
echo "Checking if wrangler.toml is gitignored..."
git check-ignore wrangler.toml && echo "✅ wrangler.toml is gitignored" || echo "⚠️  wrangler.toml NOT gitignored!"

echo ""
echo "Checking if .env is gitignored..."
git check-ignore .env && echo "✅ .env is gitignored" || echo "⚠️  .env NOT gitignored!"

echo ""
echo "Files to be committed:"
git ls-files

echo ""
echo "=== Check Complete ==="
```

Save this as `check-before-push.sh` and run it before pushing.

## 📚 Additional Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Cloudflare Workers: Best practices](https://developers.cloudflare.com/workers/platform/best-practices)
- [Git: Using .gitignore](https://git-scm.com/docs/gitignore)
