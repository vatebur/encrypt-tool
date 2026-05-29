# 加密分享工具

这是一个部署在 Cloudflare Workers 上的浏览器端加密工具。页面负责生成密钥、加密、解密和复制内容；Worker 提供静态资源托管，并通过 KV 保存可公开分享的公钥和密文记录。

## 功能概览

- 浏览器端使用 `libsodium-wrappers` 生成密钥对、加密和解密。
- 私钥只保存在当前浏览器会话中，不会上传到服务端。
- 公钥可以上传到 Cloudflare KV，其他人可选择最新公钥或从列表中选择公钥进行加密。
- 密文可以上传到 Cloudflare KV，接收方使用对应私钥读取并解密。
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

[[kv_namespaces]]
binding = "STORE"
```

`STORE` 是 Worker 代码使用的 KV 绑定名。若部署到你自己的 Cloudflare 账号，建议新建 KV namespace，并把 Wrangler 输出的 `id` 和 `preview_id` 更新到 `wrangler.toml`：

```bash
npx wrangler login
npx wrangler kv namespace create STORE
npx wrangler kv namespace create STORE --preview
```

## 部署到 Cloudflare

确认依赖已安装，并且 `wrangler.toml` 中的 KV namespace 属于当前 Cloudflare 账号：

```bash
npm install
npm run deploy
```

部署成功后，Wrangler 会输出 Worker 的访问地址。若要使用自定义域名，请在 Cloudflare 控制台为该 Worker 配置路由或自定义域。

## API

所有 API 都由 `src/index.js` 提供，响应格式为 JSON。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/public-keys` | 获取已上传公钥列表，最新在前 |
| `POST` | `/api/public-keys` | 上传公钥，body: `{ "publicKey": "...", "name": "..." }` |
| `GET` | `/api/ciphertexts?recipientPublicKey=...` | 获取某个接收公钥对应的密文列表 |
| `POST` | `/api/ciphertexts` | 上传密文，body: `{ "name": "...", "ciphertext": "...", "recipientPublicKey": "..." }` |

当前限制：

- 公钥列表最多保留 20 条。
- 每个接收公钥最多保留 10 条密文。
- `name` 最长 80 个字符。
- 公钥、密文等字符串字段最长 12000 个字符。

## 安全说明

- 服务端只保存公钥和密文，不保存私钥或明文。
- 浏览器会把当前密钥对写入 `sessionStorage`，关闭会话后需要重新生成或重新导入。
- 不要把 `.dev.vars`、Cloudflare 凭据、私钥、明文或测试敏感数据提交到仓库。
