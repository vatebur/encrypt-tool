# 加密分享工具

这是一个部署在 Cloudflare Workers 上的浏览器端加密工具。页面负责生成密钥、加密、解密和复制内容；Worker 提供静态资源托管，并通过 KV 保存可公开分享的公钥和密文记录。

## 功能概览

- 浏览器端使用 `libsodium-wrappers` 生成密钥对、加密和解密。
- 私钥只保存在当前浏览器会话中，不会上传到服务端。
- 公钥可以上传到 Cloudflare KV，其他人可选择最新公钥或从列表中选择公钥进行加密。
- 密文可以上传到 Cloudflare KV，接收方使用对应私钥读取并解密。
- 上传公钥和密文前需要通过 Cloudflare Turnstile 验证，降低公开 POST API 被滥用的风险。
- 支持复制加密链接、密文和明文；在 Clipboard API 不可用时会尝试降级复制。

## 项目结构

```text
.
├── public/
│   ├── index.html                 # 前端页面、样式和浏览器端应用逻辑
│   └── vendor/                    # 本地 vendor 的 libsodium ESM 文件
├── src/
│   └── index.js                   # Cloudflare Worker 入口，处理 API 并代理静态资源
├── wrangler.toml                  # Worker、静态资源和 KV 绑定配置
├── package.json                   # npm 脚本和依赖
├── package-lock.json              # 锁定依赖版本
└── AGENTS.md                      # 仓库协作和开发约定
```

## 本地开发

安装依赖：

```bash
npm install
```

启动本地开发服务器：

```bash
npm run dev
```

Wrangler 本地开发会模拟 KV 绑定。启动后访问终端输出的本地地址，通常是 `http://localhost:8787`。

上传功能依赖 Turnstile 配置。本地开发时可以创建 `.dev.vars`，不要提交这个文件：

```text
TURNSTILE_SITE_KEY=<your-turnstile-site-key>
TURNSTILE_SECRET_KEY=<your-turnstile-secret-key>
```

如果没有配置这两个值，页面仍可生成密钥、复制链接、加密和解密，但上传公钥和密文会被禁用或被 Worker 拒绝。

如果需要连接 Cloudflare 远端开发环境：

```bash
npm run dev:remote
```

## Cloudflare 配置

项目使用 `wrangler.toml` 配置 Worker：

```toml
name = "tool"
main = "src/index.js"
compatibility_date = "2026-03-10"
preview_urls = false

[assets]
directory = "./public"
binding = "ASSETS"

# Configure Turnstile values outside Git:
#   wrangler secret put TURNSTILE_SITE_KEY
#   wrangler secret put TURNSTILE_SECRET_KEY

[[kv_namespaces]]
binding = "STORE"
```

`STORE` 是 Worker 代码使用的 KV 绑定名。若部署到你自己的 Cloudflare 账号，先登录并新建 KV namespace：

```bash
npm install
npx wrangler login
npx wrangler kv namespace create STORE
```

如果 Wrangler 输出了 `id`，把它加入 `wrangler.toml` 的 `[[kv_namespaces]]`：

```toml
[[kv_namespaces]]
binding = "STORE"
id = "<your-kv-namespace-id>"
```

本地开发不要求 `id`，Wrangler 会使用本地模拟存储；部署到 Cloudflare 账号时必须确保该绑定能解析到真实 KV namespace。

## Turnstile 配置

1. 在 Cloudflare Dashboard 创建 Turnstile widget。
2. Widget domain 至少允许你的 Workers 域名，例如 `tool.<your-subdomain>.workers.dev`。如果使用自定义域名，也要把自定义域名加入允许列表。
3. 不要把 site key 或 secret key 写入 Git。用 Wrangler Secret 保存到 Worker：

```bash
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

`TURNSTILE_SITE_KEY` 会通过 `GET /api/config` 返回给浏览器，所以它不是高强度秘密；但为了避免仓库里出现任何 key，本项目也把它放在 Cloudflare secret 中。`TURNSTILE_SECRET_KEY` 只在 Worker 服务端调用 Turnstile `siteverify` 时使用，绝不能提交。

如果之前曾把 `TURNSTILE_SITE_KEY` 写在 `wrangler.toml` 的 `[vars]` 中，需要先删除该变量并部署一次，再执行同名 `wrangler secret put`，否则 Cloudflare 会提示 binding name 已被占用。

## 部署到 Cloudflare

部署前检查：

- `wrangler.toml` 里没有真实 Turnstile key、Cloudflare token 或其他敏感值。
- `STORE` KV namespace 已创建并绑定。
- `TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY` 已通过 `wrangler secret put` 设置。
- Turnstile widget 允许当前访问域名。

部署：

```bash
npm install
npm run deploy
```

部署成功后，Wrangler 会输出 Worker 的访问地址。若要使用自定义域名，请在 Cloudflare 控制台为该 Worker 配置路由或自定义域，并同步更新 Turnstile widget 的允许域名。

部署后验证：

```bash
curl -I https://<your-worker-host>/
curl https://<your-worker-host>/api/config
curl https://<your-worker-host>/api/public-keys
```

`/api/config` 应返回非空 `turnstileSiteKey`。不要把 `TURNSTILE_SECRET_KEY` 暴露在任何响应、日志或仓库文件里。

## WAF Rate Limiting

Turnstile 用于验证真实用户，WAF Rate Limiting 用于限制高频请求。建议在 Cloudflare Dashboard 中新增 Rate Limiting rule：

- 匹配表达式：

```text
http.request.method eq "POST" and (http.request.uri.path eq "/api/public-keys" or http.request.uri.path eq "/api/ciphertexts")
```

- 计数特征：IP。
- 阈值：每 60 秒 3 次请求。
- 超限动作：优先使用 Managed Challenge；如果当前计划不支持，则使用 Block。
- Mitigation timeout：60 秒。

这条规则只限制写入接口，不影响读取公钥、读取密文或静态页面访问。

## API

所有 API 都由 `src/index.js` 提供，响应格式为 JSON。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/config` | 获取前端需要的公开配置，当前返回 Turnstile site key |
| `GET` | `/api/public-keys` | 获取已上传公钥列表，最新在前 |
| `POST` | `/api/public-keys` | 上传公钥，body: `{ "publicKey": "...", "name": "...", "turnstileToken": "..." }` |
| `GET` | `/api/ciphertexts?recipientPublicKey=...` | 获取某个接收公钥对应的密文列表 |
| `POST` | `/api/ciphertexts` | 上传密文，body: `{ "name": "...", "ciphertext": "...", "recipientPublicKey": "...", "turnstileToken": "..." }` |

当前限制：

- 公钥列表最多保留 20 条。
- 每个接收公钥最多保留 10 条密文。
- 公钥 KV 记录设置 7 天 TTL。
- 密文 KV 记录设置 1 天 TTL。
- `name` 最长 80 个字符。
- 公钥、密文等字符串字段最长 12000 个字符。
- Turnstile token 最长 2048 个字符，并且只在服务端验证成功后才写入 KV。

## 安全说明

- 服务端只保存公钥和密文，不保存私钥或明文。
- 浏览器会把当前密钥对写入 `sessionStorage`，关闭会话后需要重新生成或重新导入。
- 不要把 `.dev.vars`、Cloudflare 凭据、Turnstile key、私钥、明文或测试敏感数据提交到仓库。
- 如果任何 Turnstile secret、Cloudflare token 或私钥曾经发到聊天、日志或公开渠道，应立即在 Cloudflare Dashboard 轮换。
- 如果上传提示 `Verification failed. Please try again.`，优先检查 Turnstile widget 允许域名、site key 与 secret 是否来自同一个 widget，以及 Worker 是否已重新部署最新 secret 配置。
