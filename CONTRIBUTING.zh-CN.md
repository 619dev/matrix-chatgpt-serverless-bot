# 贡献指南

[English](CONTRIBUTING.md) | 简体中文

## 公开 GitHub 仓库

此项目设计为可以安全地在 GitHub 上共享，而不会暴露敏感凭证。

## 重要文件

### 应该提交的文件

- `wrangler.toml.example` - 配置模板
- `.env.example` - 环境变量模板
- `src/` 中的所有源代码
- 文档（`*.md`）
- `package.json`、`tsconfig.json`
- `.gitignore`
- `setup.sh`

### 不应提交的文件

- `wrangler.toml` - 包含您的 KV/R2 ID（已被 gitignore）
- `.env` - 包含密钥（已被 gitignore）
- `.dev.vars` - 本地开发密钥（已被 gitignore）
- `node_modules/` - 依赖项（已被 gitignore）
- `.wrangler/` - 构建产物（已被 gitignore）

## 推送到 GitHub 之前

### 1. 验证没有包含密钥

```bash
# 检查潜在的密钥
git grep -i "api.key\|password\|secret" -- ':!*.example' ':!*.md'

# 确保这些文件被 gitignore
git status --ignored
```

### 2. 仔细检查 .gitignore

确保这些模式在 `.gitignore` 中：

```gitignore
wrangler.toml
.env
.dev.vars
node_modules/
.wrangler/
```

### 3. 清理

```bash
# 删除本地的 wrangler.toml（如果存在）
rm wrangler.toml

# 删除任何 .env 文件
rm .env

# 确保只有安全文件被暂存
git add -A
git status
```

### 4. 初始提交

```bash
git init
git add .
git commit -m "Initial commit: Matrix ChatGPT Bot"
```

### 5. 创建 GitHub 仓库

1. 前往 https://github.com/new
2. 创建新仓库（公开或私有）
3. 不要用 README 初始化（我们已经有了）

### 6. 推送到 GitHub

```bash
git remote add origin https://github.com/yourusername/matrix-chatgpt-bot.git
git branch -M main
git push -u origin main
```

## 从 GitHub 克隆的用户

克隆后，用户应该：

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot

# 2. 安装依赖
npm install

# 3. 运行设置脚本（推荐）
./setup.sh

# 或手动：
# 3a. 复制配置模板
cp wrangler.toml.example wrangler.toml

# 3b. 创建 Cloudflare 资源
wrangler login
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
wrangler r2 bucket create matrix-bot-storage
wrangler r2 bucket create matrix-bot-storage-preview

# 3c. 用您的 ID 更新 wrangler.toml

# 3d. 设置密钥
wrangler secret put MATRIX_USER_ID
wrangler secret put MATRIX_PASSWORD
wrangler secret put OPENAI_API_KEY

# 4. 部署
wrangler deploy
```

## 开发工作流

### 进行更改

```bash
# 1. 创建功能分支
git checkout -b feature/my-feature

# 2. 对代码进行更改

# 3. 本地测试
npm run build
wrangler dev

# 4. 提交更改
git add src/
git commit -m "Add: description of changes"

# 5. 推送到 GitHub
git push origin feature/my-feature

# 6. 在 GitHub 上创建 Pull Request
```

### 使用密钥进行本地开发

使用 `.dev.vars` 进行本地开发（已被 gitignore）：

```bash
# 创建 .dev.vars
cat > .dev.vars << EOF
MATRIX_USER_ID=@testbot:matrix.org
MATRIX_PASSWORD=test_password
OPENAI_API_KEY=sk-test-key
OPENAI_BASE_URL=https://api.openai.com/v1
EOF

# 运行本地开发服务器
wrangler dev
```

**注意**：`.dev.vars` 会自动被 gitignore，永远不会被提交。

## 安全最佳实践

### ✅ 应该做的

- 使用 `wrangler secret` 管理生产密钥
- 使用 `.dev.vars` 进行本地开发
- 将 `wrangler.toml` 保留在 `.gitignore` 中
- 使用 `wrangler.toml.example` 作为模板
- 提交前审查更改：`git diff`
- 使用 `git status --ignored` 验证被 gitignore 的文件

### ❌ 不应该做的

- 永远不要提交包含真实 ID 的 `wrangler.toml`
- 永远不要提交 `.env` 或 `.dev.vars`
- 永远不要在源代码中硬编码 API 密钥
- 永远不要提交包含敏感数据的 KV 命名空间 ID 或 R2 存储桶名称
- 永远不要记录敏感信息

## 常见问题

### 问题：意外提交了密钥

如果您意外提交了密钥：

```bash
# 1. 从 git 历史中删除文件
git rm --cached wrangler.toml

# 2. 添加到 .gitignore（如果还没有）
echo "wrangler.toml" >> .gitignore

# 3. 提交删除
git commit -m "Remove sensitive configuration file"

# 4. 立即轮换所有暴露的密钥！
wrangler secret put MATRIX_PASSWORD
wrangler secret put OPENAI_API_KEY
```

### 问题：无法推送到 GitHub

如果由于大文件导致 git 阻止推送：

```bash
# 检查大文件
git ls-files | xargs ls -lh | sort -k5 -hr | head

# 如果意外添加则删除
git rm --cached large-file
git commit --amend
```

## 持续集成（可选）

GitHub Actions 工作流示例（`.github/workflows/deploy.yml`）：

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

**注意**：您需要在 GitHub 仓库密钥中设置 `CLOUDFLARE_API_TOKEN`。

## 有问题？

如果您对贡献有疑问：
1. 检查 GitHub 上的现有问题
2. 查看 `README.zh-CN.md` 中的文档
3. 开启新问题提出您的问题

## 许可证

通过贡献，您同意您的贡献将根据 MIT 许可证授权。
