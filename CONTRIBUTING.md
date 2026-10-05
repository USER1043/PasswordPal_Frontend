# Contributing to PasswordPal

Thanks for helping out. This guide covers setup, conventions and what a good pull request looks like. For how the app is put together, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first.

PasswordPal protects people's passwords. Please read [SECURITY.md](SECURITY.md) before changing cryptography, key handling, sessions or the sync code.

## Setup

```bash
git clone https://github.com/USER1043/PasswordPal_Frontend.git
cd PasswordPal_Frontend
npm install
cp .env.example .env.local
npm run tauri dev
```

You need Node.js 20+, stable Rust and the Tauri system dependencies for your OS ([guide](https://v2.tauri.app/start/prerequisites/)). To log in you also need a running backend: see the [backend repository](https://github.com/USER1043/PasswordPal_Backend). UI and Rust tests do not need one.

## Workflow

1. Branch from `main` with a descriptive name such as `fix/unlock-cancel` or `feat/session-heartbeat`.
2. Keep the change focused: one concern per pull request.
3. Add or update tests.
4. Run `npm run test:all` and make sure it passes.
5. Open a pull request against `main`. Describe what changed, why, and how you checked it. For UI changes, say what you clicked through.

## Commit messages

Releases are automated from [Conventional Commits](https://www.conventionalcommits.org/) (see [docs/BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md)), so the format matters:

```
fix(login): explain a reused two-factor code
feat(vault): add a copy-username button
docs: describe the sync flow
refactor(db): batch local upserts
```

`fix:` makes a patch release, `feat:` a minor release and `feat!:` or a `BREAKING CHANGE:` footer a major one. `docs:`, `test:`, `chore:`, `refactor:` and `style:` do not release on their own. Do not edit `CHANGELOG.md` or version numbers by hand; the release tooling does that.

## Code style

- **TypeScript/React:** functional components and hooks. Services in `src/services/` own talking to the backend or to Tauri; pages and components should not call `invoke` or the HTTP client directly when a service function exists. Run `npm run lint` and fix warnings (the build allows none).
- **Rust:** `cargo fmt` and `cargo clippy -- -D warnings` must be clean. Put logic in testable `*_logic` functions and keep the `#[tauri::command]` wrapper thin, as `commands/auth.rs` does.
- **Comments** explain why, not what. Match the surrounding code.
- Do not add dependencies without a reason in the pull request description.

### Project-specific rules

- **Secrets never touch the UI layer longer than needed.** The master password is passed to Rust and dropped. Do not store it, a derived key, the MEK or a recovery key in React state, `localStorage`, logs or error messages.
- **Rust handles crypto.** Do not implement encryption, hashing or key derivation in TypeScript. Wrap sensitive buffers in `Zeroizing`.
- **The backend URL is injected at build time** from `VITE_BACKEND_URL`. Do not hard-code hosts, and do not widen the Tauri HTTP capability.
- **Network calls go through `src/api/axiosClient.ts`** so device headers, token refresh and the session-revoked handling apply.
- Handle the offline case: a feature that needs the server should say so rather than fail silently.

## Tests

| Layer | Command | Where |
| :--- | :--- | :--- |
| UI and services | `npm test` | `src/**/*.test.ts(x)`, `src/tests/`, Vitest + jsdom + Testing Library |
| Rust | `npm run test:rust` | `src-tauri/tests/` and unit tests next to the code |
| Everything CI runs | `npm run test:all` | type-check, lint, Vitest, fmt, clippy, cargo test |

Look at `src/pages/LoginPage.test.tsx` (mocked services, user-event flows) and `src-tauri/tests/auth_tests.rs` (crypto round trips) for patterns. Tauri APIs are mocked in `src/tests/setup.ts`. A change to behaviour should come with a test that fails without it, including error paths.

## Pull request checklist

- [ ] Focused change with a clear description
- [ ] `npm run test:all` passes
- [ ] New behaviour and error paths are tested
- [ ] No secrets, keys or personal data in code, tests, logs or screenshots
- [ ] No hard-coded backend URLs; capabilities not widened
- [ ] Docs updated if behaviour, commands or configuration changed
- [ ] Commit messages follow Conventional Commits

## Finding something to work on

[docs/ROADMAP.md](docs/ROADMAP.md) lists known issues and good first contributions, with the files involved and a rough effort for each.

## Reporting bugs and vulnerabilities

Open an issue for bugs and ideas. Report security problems privately as described in [SECURITY.md](SECURITY.md).
