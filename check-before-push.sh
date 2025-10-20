#!/bin/bash

echo "=========================================="
echo "   Security Check Before Git Push"
echo "=========================================="
echo ""

HAS_ISSUES=0

# Check if git is initialized
GIT_REPO=0
if git rev-parse --git-dir > /dev/null 2>&1; then
    GIT_REPO=1
fi

# Check for API keys
echo "🔍 Checking for API keys..."
if [ $GIT_REPO -eq 1 ] && git grep -i "sk-" -- ':!*.example' ':!*.md' ':!check-before-push.sh' ':!GITHUB_CHECKLIST.md' > /dev/null 2>&1; then
    echo "❌ Found potential API keys!"
    git grep -i "sk-" -- ':!*.example' ':!*.md' ':!check-before-push.sh' ':!GITHUB_CHECKLIST.md'
    HAS_ISSUES=1
else
    echo "✅ No API keys found"
fi

echo ""

# Check for passwords
echo "🔍 Checking for hardcoded passwords..."
if [ $GIT_REPO -eq 1 ] && git grep -iE "password.*=.*['\"]" -- ':!*.example' ':!*.md' ':!check-before-push.sh' ':!GITHUB_CHECKLIST.md' ':!wrangler.toml.example' > /dev/null 2>&1; then
    echo "❌ Found potential passwords!"
    git grep -iE "password.*=.*['\"]" -- ':!*.example' ':!*.md' ':!check-before-push.sh' ':!GITHUB_CHECKLIST.md' ':!wrangler.toml.example'
    HAS_ISSUES=1
else
    echo "✅ No hardcoded passwords found"
fi

echo ""

# Check if wrangler.toml exists and is gitignored
echo "🔍 Checking wrangler.toml..."
if [ -f "wrangler.toml" ]; then
    echo "⚠️  wrangler.toml exists in directory"
    if [ $GIT_REPO -eq 1 ] && git check-ignore wrangler.toml > /dev/null 2>&1; then
        echo "✅ wrangler.toml is properly gitignored"
    elif [ $GIT_REPO -eq 0 ]; then
        if grep -q "^wrangler.toml" .gitignore 2>/dev/null; then
            echo "✅ wrangler.toml will be gitignored"
        else
            echo "❌ wrangler.toml not in .gitignore!"
            HAS_ISSUES=1
        fi
    else
        echo "❌ wrangler.toml is NOT gitignored!"
        HAS_ISSUES=1
    fi
else
    echo "✅ wrangler.toml does not exist (good)"
fi

echo ""

# Check if .env exists and is gitignored
echo "🔍 Checking .env..."
if [ -f ".env" ]; then
    echo "⚠️  .env exists in directory"
    if [ $GIT_REPO -eq 1 ] && git check-ignore .env > /dev/null 2>&1; then
        echo "✅ .env is properly gitignored"
    elif [ $GIT_REPO -eq 0 ]; then
        if grep -q "^\.env" .gitignore 2>/dev/null; then
            echo "✅ .env will be gitignored"
        else
            echo "❌ .env not in .gitignore!"
            HAS_ISSUES=1
        fi
    else
        echo "❌ .env is NOT gitignored!"
        HAS_ISSUES=1
    fi
else
    echo "✅ .env does not exist (good)"
fi

echo ""

# Check if .dev.vars exists and is gitignored
echo "🔍 Checking .dev.vars..."
if [ -f ".dev.vars" ]; then
    echo "⚠️  .dev.vars exists in directory"
    if [ $GIT_REPO -eq 1 ] && git check-ignore .dev.vars > /dev/null 2>&1; then
        echo "✅ .dev.vars is properly gitignored"
    elif [ $GIT_REPO -eq 0 ]; then
        if grep -q "^\.dev\.vars" .gitignore 2>/dev/null; then
            echo "✅ .dev.vars will be gitignored"
        else
            echo "❌ .dev.vars not in .gitignore!"
            HAS_ISSUES=1
        fi
    else
        echo "❌ .dev.vars is NOT gitignored!"
        HAS_ISSUES=1
    fi
else
    echo "✅ .dev.vars does not exist (good)"
fi

echo ""

# Check that required template files exist
echo "🔍 Checking required template files..."
REQUIRED_FILES=("wrangler.toml.example" ".env.example" ".gitignore" "setup.sh" "README.md")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing!"
        HAS_ISSUES=1
    fi
done

echo ""

# Check .gitignore patterns
echo "🔍 Checking .gitignore patterns..."
REQUIRED_PATTERNS=("wrangler.toml" ".env" ".dev.vars" "node_modules/" ".wrangler/")
for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if grep -q "^${pattern}" .gitignore; then
        echo "✅ .gitignore includes: $pattern"
    else
        echo "❌ .gitignore missing: $pattern"
        HAS_ISSUES=1
    fi
done

echo ""

# List files that will be committed (only if in a git repo)
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "📋 Files staged for commit:"
    if git diff --cached --name-only | head -20; then
        echo ""
    else
        echo "  (no files staged)"
    fi
else
    echo "📋 Not a git repository yet. Run 'git init' to initialize."
fi

echo ""

# Summary
echo "=========================================="
if [ $HAS_ISSUES -eq 0 ]; then
    echo "✅ All checks passed! Safe to push."
    echo "=========================================="
    exit 0
else
    echo "❌ Issues found! Please fix before pushing."
    echo "=========================================="
    exit 1
fi
