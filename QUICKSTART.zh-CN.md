# 快速入门指南

5 分钟内让您的 Matrix ChatGPT 机器人运行起来！

[English](QUICKSTART.md) | 简体中文

## 前置要求

- Cloudflare 账户（免费套餐可用）
- Matrix 账户（任何家服务器）
- OpenAI API 密钥（或兼容 API）
- 已安装 Git

## 方式 1：自动化设置（最简单）

```bash
# 1. 从 GitHub 克隆
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot

# 2. 安装依赖
npm install

# 3. 全局安装 Wrangler
npm install -g wrangler

# 4. 登录 Cloudflare
wrangler login

# 5. 运行自动化设置
./setup.sh
```

脚本将自动：
- 创建 KV 命名空间
- 创建 R2 存储桶
- 生成 `wrangler.toml`
- 设置所有必需的密钥

跳到下面的**部署**部分！

## 方式 2：手动设置

### 1. 克隆并安装

```bash
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot
npm install
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建配置

```bash
cp wrangler.toml.example wrangler.toml
```

### 4. 创建 Cloudflare 资源

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview

# 创建 R2 存储桶
wrangler r2 bucket create matrix-bot-storage
wrangler r2 bucket create matrix-bot-storage-preview
```

复制 KV 命名空间 ID 并更新 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID_HERE"
preview_id = "YOUR_PREVIEW_KV_ID_HERE"
```

### 5. 配置密钥

```bash
# Matrix 账户
wrangler secret put MATRIX_USER_ID
# 示例：@mybot:matrix.org

wrangler secret put MATRIX_PASSWORD
# 您的机器人密码

# OpenAI
wrangler secret put OPENAI_API_KEY
# 您的 OpenAI API 密钥（sk-...）

# 可选：自定义 API 端点
wrangler secret put OPENAI_BASE_URL
# 默认：https://api.openai.com/v1

# 管理员用户
wrangler secret put BOT_ADMIN_USERS
# 示例：@admin:matrix.org
```

## 部署

```bash
wrangler deploy
```

## 初始化机器人

```bash
# 替换为您实际的 worker URL
export BOT_URL="https://matrix-chatgpt-bot.yourname.workers.dev"

# 登录 Matrix
curl -X POST $BOT_URL/login

# 启动同步
curl $BOT_URL/start

# 检查状态
curl $BOT_URL/status
```

## 在 Matrix 中测试

1. 创建或加入 Matrix 房间
2. 邀请您的机器人：`/invite @mybot:matrix.org`
3. 等待 2-3 分钟让机器人接受邀请
4. 发送消息：
   - **简单方式**：`!gpt 你好！`
   - **传统方式**：`@mybot:matrix.org 你好！`
5. 机器人应该会响应！

## 使用命令

尝试这些命令：

```
!gpt 给我讲个笑话     # 与 GPT 聊天（最简单的方式）
!help                   # 显示所有命令
!provider list          # 列出 AI 提供商
!reset                  # 清除对话历史
```

机器人响应三种类型的消息：
1. **`!gpt <消息>`** - 最简单的方式，无需提及
2. **`@机器人用户ID 消息`** - 传统提及方式
3. **`!命令`** - 其他机器人命令

## 添加自定义 API 提供商

### 示例：OpenRouter

```
!addprovider openrouter https://openrouter.ai/api/v1 YOUR_KEY gpt-4 claude-3-opus
!provider set openrouter
```

### 示例：本地模型

```
!addprovider local http://localhost:8000/v1 none llama-2-7b
!provider set local
```

## 故障排查

**机器人不响应？**

```bash
# 检查状态
curl $BOT_URL/status

# 检查日志
wrangler tail

# 重启同步
curl $BOT_URL/start
```

**需要重新登录？**

```bash
curl -X POST $BOT_URL/login
curl $BOT_URL/start
```

## 下一步是什么？

- 阅读 [README.zh-CN.md](README.zh-CN.md) 获取完整文档
- 查看 [DEPLOYMENT.zh-CN.md](DEPLOYMENT.zh-CN.md) 了解生产环境设置
- 在 Matrix 房间中配置高级功能

## 支持

如有问题：
1. 检查日志：`wrangler tail`
2. 查看文档
3. 在 GitHub 上开启问题

享受您的 Matrix ChatGPT 机器人！🤖
