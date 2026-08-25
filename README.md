# 加密分享工具

这是一个部署在 Cloudflare Workers 上的浏览器端加密工具。接收者生成接收链接并发给发送者；发送者在浏览器中加密内容，再通过自己的通信渠道把密文发回。Worker 只负责托管静态资源，不提供用户数据接口或存储。

## 功能概览

- 使用本地打包的 `libsodium-wrappers` 在浏览器中生成密钥对、加密和解密。
- 支持接收者与发送者两种引导流程。
- 通过包含公钥的 `?pub=...` 链接交接接收码，也支持直接粘贴接收码。
- 当前密钥对保存在浏览器的 `sessionStorage` 中，便于同一标签页会话内继续使用。
- 支持复制接收链接、密文和明文；Clipboard API 不可用时会尝试降级复制。
- 支持中英文和明暗主题。

## 项目结构

```text
.
├── public/
│   ├── index.html                 # 前端页面、样式和浏览器端应用逻辑
│   └── vendor/                    # 本地 vendor 的 libsodium ESM 文件
├── src/
│   └── index.js                   # Cloudflare Worker 静态资源入口
├── wrangler.toml                  # Worker 和静态资源配置
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

启动后访问终端输出的本地地址，通常是 `http://localhost:8787`。

如需使用 Cloudflare 远端开发环境：

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
```

`ASSETS` binding 由 `src/index.js` 转发，用于提供 `public/` 目录中的静态文件。项目不需要额外的存储或第三方验证配置。

## 部署到 Cloudflare

```bash
npm install
npm run deploy
```

部署成功后，Wrangler 会输出 Worker 的访问地址。可以用下面的命令验证首页可访问：

```bash
curl -I https://<your-worker-host>/
```

## 使用流程

1. 接收者打开页面，复制接收链接并通过可信渠道发给发送者。
2. 发送者打开链接，输入内容并在浏览器中加密。
3. 发送者复制密文，通过自己的通信渠道发回接收者。
4. 接收者把密文粘贴到原页面中并解密。

## 安全说明

- 加解密操作只在浏览器中进行；Worker 不提供数据 API，也不保存用户内容。
- 接收链接包含公钥，可以分享；解锁码是私钥，必须保密。
- 密钥对保存在当前浏览器会话的 `sessionStorage` 中。关闭标签页、清除会话数据或更换设备后，可能无法解开此前针对该密钥加密的内容。
- 重新生成密钥后，旧密文不能使用新私钥解开。
- 不要把 Cloudflare 凭据、私钥、明文、密文或测试敏感数据提交到仓库。
