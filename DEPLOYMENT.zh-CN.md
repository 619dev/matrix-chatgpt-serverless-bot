# 部署指南

[English](DEPLOYMENT.md) | 简体中文

## 分步部署

### 前置要求

1. 安装 Node.js 和 npm
2. 安装 Wrangler CLI：`npm install -g wrangler`
3. Cloudflare 账户（免费套餐可用）
4. Matrix 账户
5. OpenAI API 密钥或替代方案

### 步骤 1：Cloudflare 设置

#### 登录 Cloudflare

```bash
wrangler login
```

#### 创建 KV 命名空间

```bash
# 生产命名空间
wrangler kv:namespace create "KV"

# 预览命名空间
wrangler kv:namespace create "KV" --preview
```

这将输出类似以下内容：

```
{ binding = "KV", id = "your_namespace_id" }
```

保存这些 ID 以备下一步使用。

#### 创建 R2 存储桶

```bash
wrangler r2 bucket create matrix-bot-storage
```

### 步骤 2：配置 wrangler.toml

编辑 `wrangler.toml` 并更新：

```toml
[[kv_namespaces]]
binding = "KV"
id = "your_production_kv_id"        # 替换为您的 KV ID
preview_id = "your_preview_kv_id"    # 替换为您的预览 KV ID

[[r2_buckets]]
binding = "R2"
bucket_name = "matrix-bot-storage"
```

### 步骤 3：设置环境密钥

```bash
# Matrix 凭证
wrangler secret put MATRIX_USER_ID
# 输入：@yourbotuser:matrix.org

wrangler secret put MATRIX_PASSWORD
# 输入：your_secure_password

# OpenAI 凭证
wrangler secret put OPENAI_API_KEY
# 输入：sk-your-openai-api-key

# 可选：自定义 API 端点
wrangler secret put OPENAI_BASE_URL
# 输入：https://api.openai.com/v1

# 管理员用户（逗号分隔）
wrangler secret put BOT_ADMIN_USERS
# 输入：@admin1:matrix.org,@admin2:matrix.org

# 默认模型
wrangler secret put DEFAULT_MODEL
# 输入：gpt-4
```

### 步骤 4：安装依赖

```bash
npm install
```

### 步骤 5：部署到 Cloudflare

```bash
wrangler deploy
```

部署后，您将看到：

```
Published matrix-chatgpt-bot (0.01 sec)
  https://matrix-chatgpt-bot.yourname.workers.dev
```

### 步骤 6：初始化机器人

#### 登录 Matrix

```bash
curl -X POST https://matrix-chatgpt-bot.yourname.workers.dev/login
```

期望响应：

```json
{
  "status": "logged_in",
  "user_id": "@yourbotuser:matrix.org",
  "device_id": "ABCDEFGHIJ"
}
```

#### 启动同步循环

```bash
curl https://matrix-chatgpt-bot.yourname.workers.dev/start
```

期望响应：

```json
{
  "status": "started"
}
```

#### 检查状态

```bash
curl https://matrix-chatgpt-bot.yourname.workers.dev/status
```

期望响应：

```json
{
  "isRunning": true,
  "syncToken": "s12345_67890_..."
}
```

### 步骤 7：测试机器人

1. 邀请机器人到 Matrix 房间
2. 发送消息提及机器人：

```
@yourbotuser:matrix.org 你好！
```

或使用简单命令：

```
!gpt 你好！
```

3. 机器人应该会回复问候。

## 配置示例

### 使用 Azure OpenAI

在您的 Matrix 房间中发送：

```
!addprovider azure https://your-resource.openai.azure.com/openai/deployments/your-deployment YOUR_AZURE_API_KEY gpt-4 gpt-35-turbo
!provider set azure
```

### 使用 OpenRouter

```
!addprovider openrouter https://openrouter.ai/api/v1 YOUR_OPENROUTER_KEY gpt-4 claude-3-opus anthropic/claude-3-5-sonnet
!provider set openrouter
```

### 使用本地模型

如果您有本地模型服务器（vLLM、LocalAI、Ollama）：

```
!addprovider local http://your-server:8000/v1 none llama-2-7b mistral-7b
!provider set local
```

## 监控和日志

### 查看日志

```bash
wrangler tail
```

### 检查 KV 数据

```bash
# 列出所有键
wrangler kv:key list --binding KV

# 获取特定键
wrangler kv:key get "sync:token" --binding KV
```

### 检查 R2 存储

```bash
wrangler r2 object list matrix-bot-storage
```

## 更新机器人

进行更改后：

```bash
wrangler deploy
```

机器人将继续使用新代码运行。

## 故障排查

### Durable Objects 迁移错误

**错误**：`In order to use Durable Objects with a free plan, you must create a namespace using a new_sqlite_classes migration.`

**解决方案**：确保您的 `wrangler.toml` 使用 `new_sqlite_classes`：

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatrixSync"]  # Cloudflare 免费计划所需
```

如果您已经使用 `new_classes` 部署，您可能需要：
1. 删除 worker：`wrangler delete`
2. 更新 `wrangler.toml` 以使用 `new_sqlite_classes`
3. 重新部署：`wrangler deploy`

### 机器人无法登录

1. 检查 Matrix 凭证：
   - 验证用户名格式：`@user:server.org`
   - 密码正确
   - 账户未被锁定

2. 检查 Matrix 家服务器：
   - 验证 `wrangler.toml` 中的 `MATRIX_HOMESERVER`
   - 尝试在浏览器中访问家服务器 URL

### 机器人不响应消息

1. 检查同步状态：
```bash
curl https://your-worker.workers.dev/status
```

2. 如果未运行，重启：
```bash
curl https://your-worker.workers.dev/start
```

3. 检查日志：
```bash
wrangler tail
```

### OpenAI API 错误

1. 验证 API 密钥正确
2. 检查 API 余额/配额
3. 直接测试 API：
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Durable Object 错误

如果您看到 Durable Object 错误：

1. 检查 `wrangler.toml` 迁移部分
2. 重新部署：
```bash
wrangler deploy
```

### KV/R2 访问错误

1. 验证 `wrangler.toml` 中的命名空间/存储桶 ID
2. 检查绑定是否正确
3. 确保账户有权限

## 成本估算

使用 Cloudflare 免费套餐：

- **Workers**：每天 100,000 次请求（免费）
- **KV**：每天 100,000 次读取，1,000 次写入（免费）
- **R2**：10GB 存储，每月 100 万次操作（免费）
- **Durable Objects**：每月 100 万次请求（免费）

典型使用（5-10 个房间，中等活动）：
- **成本**：$0/月（免费套餐足够）

重度使用（50+ 房间，高活动）：
- **Workers**：约 $5/月
- **KV**：约 $0.50/月
- **R2**：约 $0.15/月
- **Durable Objects**：约 $5/月
- **总计**：约 $10-15/月

## 安全最佳实践

1. **永远不要提交密钥**：始终使用 `wrangler secret put`
2. **使用管理员白名单**：设置 `BOT_ADMIN_USERS` 以限制管理员命令
3. **启用用户白名单**：使用 `!whitelist` 命令限制机器人访问
4. **轮换 API 密钥**：定期更改密钥
5. **监控日志**：检查可疑活动

## 备份和恢复

### 备份配置

机器人会自动将配置备份到 R2，路径为：
```
config/backup-{timestamp}.json
```

### 手动备份

```bash
# 备份 KV 数据
wrangler kv:key list --binding KV > kv-backup.json

# 备份 R2 数据
wrangler r2 object list matrix-bot-storage > r2-backup.json
```

### 恢复

```bash
# 恢复 KV 键
wrangler kv:key put "provider:openai" --binding KV < provider.json

# 重新登录 Matrix
curl -X POST https://your-worker.workers.dev/login
```

## 高级配置

### 自定义同步间隔

编辑 `wrangler.toml`：

```toml
[triggers]
crons = ["*/5 * * * *"]  # 每 5 分钟而不是 2 分钟
```

### 增加上下文大小

在 Matrix 房间中：

```
!setconfig maxContextMessages 50
```

### 自定义系统提示

在 Matrix 房间中：

```
!setprompt 你是一个专门从事编程和技术的有用 AI 助手。
```

## 生产检查清单

- [ ] 配置密钥
- [ ] 创建并配置 KV 命名空间
- [ ] 创建并配置 R2 存储桶
- [ ] 机器人登录 Matrix
- [ ] 启动同步循环
- [ ] 配置管理员用户
- [ ] 配置默认提供商
- [ ] 在房间中测试机器人
- [ ] 启用监控
- [ ] 制定备份策略
- [ ] 查看文档

## 支持

如有问题和疑问：
- 检查日志：`wrangler tail`
- 查看文档：README.zh-CN.md
- 在 GitHub 上开启问题
