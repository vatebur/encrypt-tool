# Repository Guidelines

## Project Structure & Module Organization

- `src/index.js` contains the Worker entry point and delegates requests to the static asset binding.
- `public/index.html` contains the full client UI, styles, and browser-side application logic.
- `wrangler.toml` defines the Worker name, entry point, compatibility date, and asset binding.
- `package.json` and `package-lock.json` define the Node/Wrangler toolchain.

Keep frontend-only changes in `public/index.html`. Change `src/index.js` only when Worker request handling or bindings need to change.

## Build, Test, and Development Commands

- `npm install` installs the local Wrangler dependency from `package-lock.json`.
- `npm run dev` starts `wrangler dev` for local development.
- `npm run dev:remote` runs the Worker against Cloudflare's remote development environment.
- `npm run deploy` deploys the Worker with the settings in `wrangler.toml`.

There is no separate build step; Wrangler serves and deploys the Worker plus `public/` assets.

## Coding Style & Naming Conventions

Use modern JavaScript with two-space indentation and concise function names that describe UI actions or Worker behavior. Prefer `const` by default and `let` only for reassigned values.

The frontend is a single HTML file with embedded CSS and JavaScript. Keep CSS variables in `:root`, reuse existing class patterns such as `.card`, `.badge`, and `.textarea`, and avoid introducing a framework unless the structure is intentionally changed.

## Testing Guidelines

Automated tests are not configured yet. For now, validate changes manually with `npm run dev` and exercise key flows: theme switching, encryption, decryption, key generation/import, and copy/download actions.

If tests are added, place them in a dedicated `test/` or `tests/` directory and add an `npm test` script. Name tests after the behavior under test, for example `encryption-roundtrip.test.js`.

## Commit & Pull Request Guidelines

Local Git history is not available in this checkout, so use a clear conventional style: `feat: add key export`, `fix: handle empty ciphertext`, or `docs: update contributor guide`.

Pull requests should include a short summary, manual test notes, and screenshots or screen recordings for visible UI changes. Link related issues when available and call out any changes to `wrangler.toml`, Cloudflare bindings, or deployment behavior.

## Security & Configuration Tips

Do not commit secrets, private keys, generated plaintext, or Cloudflare credentials. Keep cryptographic operations browser-side unless there is a deliberate design change, and review any dependency additions carefully because this tool handles sensitive user input.
