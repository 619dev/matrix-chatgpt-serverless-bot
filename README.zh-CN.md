# Matrix ChatGPT 机器人

一个基于 OpenAI ChatGPT 的无服务器 Matrix 机器人，部署在 Cloudflare Workers 上，使用 KV 和 R2 存储。

[English](README.md) | 简体中文

## 功能特性

- 🤖 **AI 驱动对话**：在 Matrix 房间中与 OpenAI 模型聊天
- 🔌 **自定义 API 提供商**：支持自定义 OpenAI 兼容 API（Azure、OpenRouter、本地模型等）
- 💾 **持久化存储**：对话历史存储在 Cloudflare R2 中
- ⚡ **无服务器**：完全运行在 Cloudflare Workers 和 Durable Objects 上
- 🌐 **全球边缘网络**：通过 Cloudflare 全球网络实现低延迟响应
- 🔒 **访问控制**：支持管理员和白名单
- 📝 **丰富命令**：多个配置和管理命令

## 架构

- **Cloudflare Workers**：无服务器计算
- **Durable Objects**：Matrix 同步状态管理
- **KV 存储**：配置和会话数据
- **R2 存储**：对话历史和日志
- **Matrix 协议**：客户端-服务器 API 集成
- **OpenAI API**：聊天补全（可自定义端点）

## 前置要求

1. 启用 Workers 的 Cloudflare 账户（支持免费套餐）
2. Matrix 账户（任何家服务器）
3. OpenAI API 密钥或兼容 API 端点

**注意**：此机器人可在 Cloudflare 免费套餐上运行！它使用 `new_sqlite_classes` 作为 Durable Objects，与免费计划兼容。

## 设置

### 方式 1：自动化设置（推荐）

```bash
# 从 GitHub 克隆
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot

# 安装依赖
npm install

# 运行自动化设置脚本
./setup.sh
```

设置脚本将自动：
- 创建 KV 命名空间
- 创建 R2 存储桶
- 从模板生成 `wrangler.toml`
- 引导您设置密钥

### 方式 2：手动设置

#### 1. 克隆并安装

```bash
git clone https://github.com/yourusername/matrix-chatgpt-bot.git
cd matrix-chatgpt-bot
npm install
```

#### 2. 创建 wrangler.toml

```bash
cp wrangler.toml.example wrangler.toml
```

#### 3. 配置 Cloudflare

登录 Cloudflare：
```bash
wrangler login
```

创建 KV 命名空间：
```bash
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
```

创建 R2 存储桶：
```bash
wrangler r2 bucket create matrix-bot-storage
wrangler r2 bucket create matrix-bot-storage-preview
```

使用您的命名空间 ID 更新 `wrangler.toml`。

#### 4. 设置密钥

```bash
wrangler secret put MATRIX_USER_ID
# 输入：@yourbotuser:matrix.org

wrangler secret put MATRIX_PASSWORD
# 输入：your_bot_password

wrangler secret put OPENAI_API_KEY
# 输入：sk-your-api-key

wrangler secret put OPENAI_BASE_URL
# 输入：https://api.openai.com/v1（或自定义 URL）

wrangler secret put BOT_ADMIN_USERS
# 输入：@admin1:matrix.org,@admin2:matrix.org
```

#### 5. 部署

```bash
wrangler deploy
```

#### 6. 初始化机器人

```bash
# 登录 Matrix
curl -X POST https://your-worker.workers.dev/login

# 启动同步循环
curl https://your-worker.workers.dev/start
```

## 使用方法

### 基本命令

提及机器人或使用以 `!` 开头的命令：

- `!help` - 显示可用命令
- `!gpt <消息>` - 与 GPT 聊天（任何人都可以使用，无需提及）
- `!reset` - 清除对话历史
- `!provider` - 显示当前 AI 提供商
- `!provider list` - 列出所有可用提供商
- `!provider set <名称>` - 切换到不同的提供商
- `!model <名称>` - 为当前房间设置 AI 模型

### 管理员命令

- `!addprovider <名称> <基础URL> <API密钥> [模型...]` - 添加新的 AI 提供商
- `!delprovider <名称>` - 删除 AI 提供商
- `!seturl <基础URL>` - 设置默认 OpenAI 基础 URL
- `!stats` - 显示机器人统计信息

### 与机器人聊天

有三种方式与机器人交互：

#### 1. 使用 !gpt 命令（最简单，无需提及）

```
!gpt 法国的首都是什么？
```

```
!gpt 给我讲个笑话
```

#### 2. 提及机器人

```
@botuser:matrix.org 法国的首都是什么？
```

#### 3. 使用其他命令

```
!help
!reset
!provider list
```

## 自定义 API 提供商

机器人支持任何与 OpenAI 兼容的 API。以下是一些示例：

### Azure OpenAI

```bash
!addprovider azure https://your-resource.openai.azure.com/openai/deployments/your-deployment YOUR_AZURE_KEY gpt-4 gpt-35-turbo
!provider set azure
```

### OpenRouter

```bash
!addprovider openrouter https://openrouter.ai/api/v1 YOUR_OPENROUTER_KEY gpt-4 claude-3-opus
!provider set openrouter
```

### 本地模型（vLLM、LocalAI、Ollama）

```bash
!addprovider local http://localhost:8000/v1 none llama-2-7b mistral-7b
!provider set local
```

### Together AI

```bash
!addprovider together https://api.together.xyz/v1 YOUR_TOGETHER_KEY meta-llama/Llama-2-70b-chat-hf
!provider set together
```

## 配置

### 房间级配置

每个房间可以在 KV 中拥有自己的配置：

```typescript
{
  provider: "openai",      // AI 提供商名称
  model: "gpt-4",          // 模型名称
  temperature: 0.7,        // 响应随机性（0-2）
  maxTokens: 2000,         // 最大响应长度
  systemPrompt: "..."      // 自定义系统提示
}
```

### 全局配置

存储在 KV 中 `config:global` 的全局设置：

```typescript
{
  defaultProvider: "openai",
  defaultModel: "gpt-4",
  maxContextMessages: 20   // 上下文中保留的消息数量
}
```

## 存储结构

### KV 键

- `sync:token` - Matrix 同步令牌
- `auth:access_token` - Matrix 访问令牌
- `auth:user_id` - 机器人用户 ID
- `auth:device_id` - Matrix 设备 ID
- `room:config:{roomId}` - 房间特定配置
- `user:settings:{userId}` - 用户偏好设置
- `provider:{name}` - AI 提供商配置
- `config:global` - 全局机器人配置
- `config:admins` - 管理员用户列表
- `config:whitelist` - 允许的用户列表

### R2 路径

- `conversations/{roomId}/history.json` - 对话历史
- `logs/{date}/{roomId}/{timestamp}.json` - 消息日志
- `images/{messageId}.{ext}` - 生成的图像
- `uploads/{userId}/{fileId}` - 用户上传
- `config/backup-{timestamp}.json` - 配置备份

## 开发

### 本地开发

```bash
npm run dev
```

### 类型检查

```bash
npm run build
```

## 测试机器人

查看 [TEST_CHECKLIST.zh-CN.md](./TEST_CHECKLIST.zh-CN.md) 获取完整的分步指南。

**快速测试：**

1. 在 Matrix 中邀请机器人：`/invite @your-bot-user-id:oi6.uk`
2. 等待 2-3 分钟让机器人接受邀请
3. 尝试 `!gpt` 命令：`!gpt 你好！`
4. 或提及机器人：`@your-bot-user-id:oi6.uk 你好！`
5. 或使用帮助：`!help`

**重要**：机器人响应以下方式：
- `!gpt <消息>` - 最简单的方式，无需提及
- `@机器人用户ID 消息` - 传统提及方式
- `!命令` - 其他机器人命令

## API 端点

- `GET /` - 健康检查
- `GET /health` - 详细健康状态
- `POST /login` - 通过 Matrix 进行身份验证
- `GET /start` - 启动同步循环
- `GET /stop` - 停止同步循环
- `GET /status` - 获取同步状态

## 故障排查

### Durable Objects 错误（免费计划）

如果您遇到关于 `new_classes` 迁移的错误：

```
In order to use Durable Objects with a free plan, you must create a namespace using a `new_sqlite_classes` migration.
```

确保您的 `wrangler.toml` 使用 `new_sqlite_classes` 而不是 `new_classes`：

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatrixSync"]  # 用于免费计划
```

### KV 绑定名称错误

`wrangler.toml` 中的 KV 绑定名称**必须**是 `"KV"`（大写）：

```toml
[[kv_namespaces]]
binding = "KV"  # 必须与代码匹配
id = "your_id_here"
```

命名空间标题（在仪表板中显示）可以是任何内容，但绑定必须是 "KV"。

### 机器人不响应

1. 检查同步是否正在运行：`curl https://your-worker.workers.dev/status`
2. 检查 Cloudflare 仪表板中的日志
3. 验证身份验证：检查 KV 中的 `auth:access_token`
4. 确保机器人已被邀请到房间

### API 错误

1. 验证 API 密钥是否正确
2. 检查基础 URL 格式（不应以 `/` 结尾）
3. 使用 curl 直接测试 API 端点
4. 检查 Cloudflare Workers 日志

### 同步循环停止

1. 重启同步：`curl https://your-worker.workers.dev/start`
2. 检查身份验证是否过期
3. 重新登录：`curl -X POST https://your-worker.workers.dev/login`

## 限制

- **KV 写入限制**：KV 每秒每个键限制 1 次写入
- **请求超时**：标准计划的 Workers 在 30 秒后超时
- **内存**：Workers 有 128MB 内存限制
- **R2 操作**：免费套餐包含每月 100 万次请求

## 安全性

- 所有 API 密钥存储为 Cloudflare 密钥
- 管理员命令仅限于配置的管理员
- 可选的用户白名单进行访问控制
- 不记录或暴露凭证

## 许可证

MIT

## 贡献

欢迎贡献！请打开问题或 PR。

查看 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md) 了解更多信息。

## 致谢

灵感来源于：
- [ChatGPT-Telegram-Workers](https://github.com/TBXark/ChatGPT-Telegram-Workers)
- [matrix_chatgpt_bot](https://github.com/hibobmaster/matrix_chatgpt_bot)
