# Matrix 机器人测试清单

[English](TEST_CHECKLIST.md) | 简体中文

## 起飞前检查

1. **验证机器人正在运行**
   ```bash
   curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/status
   ```
   期望结果：`{"isRunning":true,"syncToken":"..."}`

2. **检查密钥**
   ```bash
   wrangler secret list
   ```
   必需的密钥：
   - `MATRIX_USER_ID`（例如，`@botuser:oi6.uk`）
   - `MATRIX_PASSWORD`
   - `OPENAI_API_KEY`

   可选：
   - `OPENAI_BASE_URL`
   - `BOT_ADMIN_USERS`（如果设置，只有这些用户可以使用机器人）
   - `DEFAULT_MODEL`

## 分步测试

### 步骤 1：邀请机器人到房间

在您的 Matrix 客户端中：
```
/invite @your-bot-user-id:oi6.uk
```

**重要**：机器人每 2 分钟自动接受邀请（通过 cron）。
邀请后等待 2-3 分钟再进行测试。

### 步骤 2：验证机器人已加入

检查机器人是否出现在房间成员列表中。

### 步骤 3：发送测试消息

**✅ 正确的消息格式：**

**选项 1：使用 !gpt 命令（最简单，推荐）**
```
!gpt 你好
```

```
!gpt 天气怎么样？
```

**选项 2：提及机器人**
```
@your-bot-user-id:oi6.uk 你好
```

```
@your-bot-user-id:oi6.uk 天气怎么样？
```

**选项 3：使用其他命令**
```
!help
```

```
!reset
```

**❌ 错误格式（机器人不会响应）：**

```
你好
```

```
嘿机器人，你好吗？
```

机器人响应以下方式：
- `!gpt <消息>` - 与 GPT 聊天（无需提及）
- `@机器人用户ID 消息` - 传统提及方式
- `!命令` - 其他机器人命令

### 步骤 4：检查响应时间

- 机器人每 2 分钟检查一次新消息（cron 计划）
- 响应应在 2-3 分钟内出现
- 如果 5 分钟后没有响应，检查日志

### 步骤 5：查看 Cloudflare 日志

1. 前往 https://dash.cloudflare.com
2. 导航到：Workers & Pages → matrix-chatgpt-bot
3. 点击"Logs"选项卡
4. 查找：
   - `"Joined room: !..."`
   - `"Processing message from @sender:..."`
   - 任何错误消息

## 常见问题

### 机器人不响应

**问题**：机器人不回复消息

**可能原因：**

1. **消息格式不正确**
   - 解决方案：使用 `!gpt 你好` 或包含完整机器人用户 ID：`@botname:oi6.uk 你好`

2. **用户不在允许列表中**
   - 检查是否设置了 `BOT_ADMIN_USERS` 密钥
   - 如果设置了，只有列出的用户可以使用机器人
   - 解决方案：将自己添加到列表或删除该密钥

3. **机器人尚未加入房间**
   - 邀请后等待 2-3 分钟
   - 检查 Cloudflare 日志中的"Joined room"消息

4. **API 密钥问题**
   - 无效或过期的 `OPENAI_API_KEY`
   - 检查日志中的 API 错误

5. **Cron 未触发**
   - 在 Cloudflare 仪表板中验证：Workers → Triggers → Cron Triggers
   - 应显示：`*/2 * * * *`（每 2 分钟）

### 机器人不加入房间

**问题**：机器人不接受邀请

**解决方案：**
- 等待 2-3 分钟（cron 每 2 分钟运行一次）
- 检查日志中的错误
- 验证机器人有有效的身份验证
- 尝试重新邀请

### 身份验证错误

**问题**：机器人登录失败

**解决方案：**
```bash
# 重新登录
curl -X POST https://matrix-chatgpt-bot.facilis-velox.workers.dev/login

# 检查结果
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/status
```

## 快速调试命令

```bash
# 检查健康状态
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/health

# 检查状态
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/status

# 强制登录
curl -X POST https://matrix-chatgpt-bot.facilis-velox.workers.dev/login

# 启动同步（如果停止）
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/start

# 停止同步（用于调试）
curl https://matrix-chatgpt-bot.facilis-velox.workers.dev/stop
```

## 工作流程示例

1. 部署机器人：`wrangler deploy`
2. 登录：`curl -X POST https://your-worker.workers.dev/login`
3. 启动：`curl https://your-worker.workers.dev/start`
4. 在 Matrix 中：`/invite @botuser:oi6.uk`
5. 等待 2-3 分钟
6. 发送：`!gpt 你好！` 或 `@botuser:oi6.uk 你好！`
7. 等待最多 2 分钟获得响应

## 监控

实时观察日志：
```bash
wrangler tail
```

或使用 Cloudflare 仪表板查看历史日志。

## 测试命令

机器人工作后尝试这些命令：

```
!gpt 给我讲个笑话
!gpt 解释量子计算
!help
!reset
!provider list
!model
@botuser:oi6.uk 什么是AI？
```

## 需要帮助？

如果按照所有步骤后机器人仍不响应：

1. 检查 Cloudflare Workers 日志中的错误
2. 验证所有密钥设置正确
3. 确保 MATRIX_HOMESERVER 与您的用户域匹配
4. 尝试删除并重新部署：`wrangler delete && wrangler deploy`
