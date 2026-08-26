# Repository Guidelines

## Project Structure & Module Organization

- `index.html` contains the complete UI, styles, and browser-side application logic.
- `vendor/libsodium.js` and `vendor/libsodium-wrappers.js` provide the cryptographic runtime as traditional browser scripts.
- `vendor/fonts/` contains the local WOFF2 fonts used by the page.

Keep application changes in `index.html`. Treat files under `vendor/` as vendored assets: replace them deliberately from a trusted source instead of editing generated or minified contents by hand.

## Build, Test, and Development Commands

The project has no dependency installation or build step. Open `index.html` directly for offline use.

To preview through HTTP, run any static file server from the repository root. For example:

```bash
python -m http.server 8000
```

The repository root is also the deployment directory. Do not add a platform-specific runtime or deployment configuration unless the project structure is intentionally changed.

## Coding Style & Naming Conventions

Use modern JavaScript with two-space indentation and concise function names that describe UI behavior. Prefer `const` by default and `let` only for reassigned values.

The frontend is a single HTML file with embedded CSS and JavaScript. Keep CSS variables in `:root`, reuse existing class patterns such as `.card`, `.badge`, and `.textarea`, and avoid introducing a framework unless the structure is intentionally changed.

Load `vendor/libsodium.js` before `vendor/libsodium-wrappers.js`, and load both before the application script. Keep the application script compatible with a normal classic `<script>` so the page continues to work from `file://`.

## Testing Guidelines

Automated tests are not configured. Validate changes both by opening `index.html` directly and through a static HTTP server. Exercise language and theme switching, key generation, receiver link and code parsing, encryption, decryption, and copy actions. Confirm that all scripts and fonts load locally and that normal use makes no external network requests.

If tests are added later, keep them optional and do not make the static page depend on a build step.

## Commit & Pull Request Guidelines

Use clear conventional commit messages such as `feat: add key export`, `fix: handle empty ciphertext`, or `docs: update usage guide`.

Pull requests should include a short summary, manual test notes, and screenshots or screen recordings for visible UI changes. Link related issues when available and call out any change that affects offline use, static hosting, vendored assets, or cryptographic behavior.

## Security Tips

Do not commit private keys, generated plaintext, ciphertext, or other test-sensitive data. Keep cryptographic operations browser-side unless there is a deliberate design change, and review vendored asset updates carefully because this tool handles sensitive user input.
