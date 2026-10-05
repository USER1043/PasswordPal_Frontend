# PasswordPal

PasswordPal is a zero-knowledge, local-first password manager for the desktop, built with Tauri v2, React and Rust. Your vault is encrypted on your device before it goes anywhere. The server stores ciphertext it cannot read.

This repository is the desktop app. The API it talks to lives in [PasswordPal_Backend](https://github.com/USER1043/PasswordPal_Backend).

## Features

- **Zero-knowledge encryption.** Your master password never leaves the device. Keys are derived with Argon2id, and the vault key is wrapped with AES-256-GCM. See [docs/CRYPTO.md](docs/CRYPTO.md).
- **Local-first.** Entries are stored in an on-device SQLite database and synced in the background. You can read, add and edit entries offline, and log in offline with a cached credential check.
- **Recovery key.** A one-time key shown at registration lets you reset a forgotten master password without the server ever learning it. Recovery is proven with an Ed25519 signature.
- **Two-factor authentication.** TOTP with backup codes, and an optional "trust this device" for 30 days.
- **Device management and audit log.** See where you are signed in, revoke or block a device, and review login history.
- **Security tooling.** Password generator, vault health dashboard (weak, reused, breached), and breach checks using k-anonymity (only a 5-character hash prefix leaves the app).
- **Safe defaults.** Auto-lock after 15 minutes of inactivity (keys are wiped from memory), clipboard cleared 30 seconds after copying, and sensitive Rust buffers zeroized after use.
- **Import and export.** CSV import and export from Settings.

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Shell | Tauri v2 |
| UI | React 18, TypeScript, Vite 7, Tailwind CSS 3, lucide-react |
| Native core | Rust: `aes-gcm`, `argon2`, `blake3`, `ed25519-dalek`, `zeroize`, `rusqlite` |
| HTTP | Tauri's native HTTP plugin (no browser CORS), scoped to one backend URL |
| Tests | Vitest + Testing Library (UI), `cargo test` (Rust) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (CI uses 24)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Your platform's Tauri system dependencies: see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) (WebKitGTK and build tools on Linux, Xcode tools on macOS, WebView2 and MSVC on Windows)
- A running [backend](https://github.com/USER1043/PasswordPal_Backend) (local or hosted)

### Run in development

```bash
git clone https://github.com/USER1043/PasswordPal_Frontend.git
cd PasswordPal_Frontend
npm install
cp .env.example .env.local   # set VITE_BACKEND_URL if your backend is not on localhost:3000
npm run tauri dev
```

`npm run tauri dev` starts the Vite dev server and the desktop window together.

### Point the app at a backend

The backend URL is injected at build time, never hard-coded:

```bash
VITE_BACKEND_URL=https://your-backend.example.com npm run tauri build
```

One variable does two jobs: it is the API base URL for the UI, and `src-tauri/build.rs` turns it into the only host the HTTP plugin is allowed to call (`src-tauri/capabilities/backend-url.json`, generated and git-ignored). Changing it needs a rebuild. Details are in [docs/BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md).

### Build

```bash
npm run tauri build
```

Installers are written to `src-tauri/target/release/bundle/`.

## Scripts

| Command | What it does |
| :--- | :--- |
| `npm run tauri dev` | Run the desktop app with hot reload |
| `npm run tauri build` | Build installers for your OS |
| `npm run dev` | Vite only (UI in a browser; native commands will not work) |
| `npm run build` | Type-check and build the web assets |
| `npm run lint` | ESLint |
| `npm test` | Vitest (UI and service tests) |
| `npm run test:rust` | `cargo fmt --check`, `clippy -D warnings`, `cargo test` |
| `npm run test:all` | Type-check, lint, Vitest and the Rust checks |

## Project layout

```
src/                  React app
  pages/              Login, Register, Recovery, Vault, Security, Generator, Audit log, Settings
  components/         Layout, sidebar, modals, unlock screen, toasts, device management
  services/           authService, vaultService, totpService, breachService, networkProbe, deviceService
  api/axiosClient.ts  HTTP client: headers, token refresh, session-revoked event
  context/            Notifications and sync-conflict state
src-tauri/            Rust core
  src/crypto.rs       Key derivation, recovery signature
  src/commands/       Tauri commands: auth, entry (encrypt/decrypt), vault (lock)
  src/db.rs           Local SQLite: vault rows, auth cache, device identity
  src/state.rs        In-memory unlocked key (zeroized on lock)
  build.rs            Generates the backend HTTP capability from VITE_BACKEND_URL
  tests/              Rust integration tests
docs/                 Architecture, cryptography, build/release, roadmap
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): React/Rust split, IPC commands, local database, sync and session handling
- [Cryptography](docs/CRYPTO.md): key hierarchy, formats and recovery signature
- [Build and release](docs/BUILD_AND_RELEASE.md): environment, CI/CD, releases
- [Roadmap and known issues](docs/ROADMAP.md): where help is welcome
- [Contributing](CONTRIBUTING.md) and [Security policy](SECURITY.md)

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and take extra care with anything under `src-tauri/src/crypto.rs` or `src-tauri/src/commands/`.

## License

[MIT](LICENSE.md)
