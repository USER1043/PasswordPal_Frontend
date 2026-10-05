# Security policy

PasswordPal is a password manager, so security reports are taken seriously.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately with GitHub's [private vulnerability reporting](https://github.com/USER1043/PasswordPal_Frontend/security/advisories/new) for this repository, including:

- what you found and where (file, command or screen)
- steps to reproduce
- the impact you think it has

You can expect an acknowledgement within a few days. Please give us reasonable time to fix the problem before disclosing it. Issues in the server belong in the [backend repository](https://github.com/USER1043/PasswordPal_Backend/security/advisories/new).

## Supported versions

Only the latest release and the current `main` branch are supported.

## Scope

In scope: key derivation and handling, encryption of vault data, the recovery flow, local storage, session and device handling, the Tauri capability and IPC surface, and the update and build pipeline.

Out of scope: attacks that need malware or full control of an unlocked device, physical attacks on a running machine, and social engineering.

## Security design in brief

- The master password is processed in Rust and never sent anywhere. Keys come from Argon2id (64 MiB, 3 passes, 4 lanes) and BLAKE3 domain-separated derivation; the vault key is wrapped with AES-256-GCM.
- Entries are encrypted before they are stored locally or sent to the server. The server only sees ciphertext.
- The unlocked key lives only in Rust memory (`Zeroizing`) and is wiped on lock, logout and after 15 minutes of inactivity.
- Requests made through Tauri's HTTP plugin can reach exactly one host, the backend URL fixed at build time. This does not yet restrict the webview's own network access, because no Content Security Policy is set (see the limitations below).
- Recovery uses an Ed25519 signature over a one-time server challenge; the recovery key never leaves the device.
- Passwords copied to the clipboard are cleared after 30 seconds.

See [docs/CRYPTO.md](docs/CRYPTO.md) for the formats.

## Known limitations

Tracked in [docs/ROADMAP.md](docs/ROADMAP.md). The main ones:

- Decrypted entries stay in UI memory while the unlock screen is shown after an auto-lock.
- A device revoked while it is unlocked is only noticed on its next request.
- The webview has no Content Security Policy configured yet.
- The local SQLite file caches the derived authentication value (`auth_cache.local_password_hash`) in plain form for offline login. It is not the master password or a vault key, but it is the credential the server checks, so protect the file with full-disk encryption. Offline login can be made to rely on unwrapping the vault key instead; see the roadmap.
- Vault rows in local SQLite stay encrypted, but the file also holds the wrapped vault key, so access to it allows offline guessing: use a strong master password.
- The "export" in Settings writes plaintext CSV.
