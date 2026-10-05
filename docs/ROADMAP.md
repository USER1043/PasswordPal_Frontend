# Roadmap and known issues

This is a map of where the project can be improved, with the files involved and a rough size for each item (**S** about an hour, **M** about a day, **L** several days). Every item was checked against the code. Check the current source before starting: something may have been fixed since this was written. Comment on or open an issue before starting a large item.

The ones marked 🟢 are good first contributions.

## Security and privacy

| Item | Where | Size |
| :--- | :--- | :--- |
| **Decrypted entries stay in memory after auto-lock.** `App.tsx` shows `UnlockScreen` on top of the pages, which stay mounted with their state. Unmount authenticated pages and clear their state when locking. | `App.tsx`, `pages/VaultPage.tsx` | M |
| **Detect a revoked device promptly.** A revoked or blocked device is only noticed on its next request. Add an authenticated heartbeat (needs a small backend endpoint), a check on window focus, a full wipe on `SESSION_REVOKED`, and a limit on how long a device may stay unlocked offline (proposal: 7 days, measured with the server clock). | `App.tsx`, `api/axiosClient.ts`, backend | L |
| **Stop caching the derived auth hash.** `auth_cache.local_password_hash` stores the value the server accepts as a credential. Offline login already unwraps the vault key; a successful unwrap is enough proof of the password, so the cached hash can go. | `src-tauri/src/db.rs`, `services/authService.ts` | M |
| **Set a Content Security Policy.** `tauri.conf.json` has `"csp": null`. Add a strict policy (`default-src 'self'`, with `connect-src` for the injected backend URL) and fix whatever breaks. | `src-tauri/tauri.conf.json` | M |
| **Unlock "Cancel" does not log out.** `handleUnlockCancel` only changes the view, so tokens and the server session stay. A revocation while locked also leaves the lock screen up. Route both through `authService.logout()` and reset lock state. | `App.tsx` | S 🟢 |
| **Breach check reports "not breached" when the check failed.** `checkPasswordBreach` catches network errors and returns `{ breached: false }`, so the dashboard can say all clear when nothing was checked. Return a "could not check" state and show it. | `services/breachService.ts`, `pages/SecurityDashboardPage.tsx` | S 🟢 |
| **Export is plaintext but labelled "encrypted backup".** Fix the label and warn before download, or add a real encrypted export. | `pages/SettingsPage.tsx` | S 🟢 |
| **Clipboard clearing.** `App.tsx` replaces `navigator.clipboard.writeText` and never restores it; the timer clears the clipboard even if the user copied something else since. Only clear if the clipboard still holds what we copied. | `App.tsx` | S 🟢 |
| **No way to wipe local data.** `clear_local_auth_cache` is registered but never called, and logout keeps the local database on purpose. Add an explicit "remove local data from this device" action. | `db.rs`, `pages/SettingsPage.tsx` | M |

## Sync and data correctness

| Item | Where | Size |
| :--- | :--- | :--- |
| **Entries deleted on another device are never removed locally.** The backend's `GET /api/vault` filters out deleted rows, so the app never sees tombstones. Use the delta endpoint (`GET /api/vault/sync`), which returns deleted records, or remove local rows missing from a full pull. | `services/vaultService.ts` (`fetchVault`) | M |
| **A permanently failing sync item retries forever, silently.** Non-network, non-409 errors are only logged. Count failures, mark the row, and tell the user. | `services/vaultService.ts` (`syncOfflineVault`) | M |
| **Full download on every vault load.** `fetchVault` pushes pending items, downloads everything, upserts one record per IPC call and decrypts all. Use delta sync, a batch upsert command, and read local data first. | `vaultService.ts`, `db.rs` | L |
| **"Old password" and "Modified" are placeholders.** `isOld` is always `false` and `updated_at` is set to "now". Carry `updated_at` from the server records. | `pages/SecurityDashboardPage.tsx`, `pages/VaultPage.tsx` | M |
| **`getActiveUserEmail()` falls back to `"unknown"`**, which can orphan local rows; offline login stores a mock token in `localStorage`. | `services/vaultService.ts`, `services/authService.ts` | S 🟢 |
| **CSV import is naive.** It splits on commas and newlines, so quoted fields break; rows save one at a time with a sync each; the success message ignores failures; picking the same file twice does nothing. | `pages/SettingsPage.tsx` | M |

## Performance and UX

| Item | Where | Size |
| :--- | :--- | :--- |
| **Spinner on every page change.** There is no router or cache, so pages unmount on navigation and reload their data. Keep the vault in a shared store, load once, and refresh in the background. | `App.tsx`, `pages/*`, new context | L |
| **One connectivity source.** `App.tsx` already polls `/health` and emits `network-status`, but `SyncStatus` and several pages probe on their own. Share one hook. | `App.tsx`, `components/SyncStatus.tsx`, pages | M |
| **Re-render churn.** `NotificationContext` recreates its value every render; `VaultPage` recomputes lists per keystroke; `PasswordItem` is not memoized. | `context/NotificationContext.tsx`, `pages/VaultPage.tsx` | S 🟢 |
| **Dynamic Tailwind class is purged in production.** `` `text-${stat.color}-400` `` in `SecurityDashboardPage` loses its colour in release builds. Use a lookup of full class names. | `pages/SecurityDashboardPage.tsx` | S 🟢 |
| **Design system.** Class strings are copied across pages. Introduce tokens and shared `Button`, `Card`, `Modal` and `ConfirmDialog` components, and replace native `alert()`/`confirm()`. | `tailwind.config.js`, `src/components/` | L |
| **Logo and icons.** `public/logo.png` is a 1125 px opaque PNG used at 32 px and the favicon is the Vite default. A vector mark with a transparent background and regenerated `src-tauri/icons/` (`npx tauri icon`) would help. | `public/`, `index.html`, `src-tauri/icons` | M |
| **Page layout.** Nested `min-h-screen` backgrounds, duplicate Add and Settings entry points, and inconsistent page headers. | `pages/VaultPage.tsx`, `PasswordGeneratorPage.tsx`, `components/AppLayout.tsx` | M |
| **Window title** is lowercase `passwordpal`; `Cargo.toml` still says "A Tauri App". | `tauri.conf.json`, `Cargo.toml` | S 🟢 |

## Accessibility 🟢

Spread across the UI, and easy to take one component at a time:

- icon-only buttons (view toggles, copy, show/hide, refresh) need `aria-label`
- modals (`AddPasswordModal`, the Settings re-auth dialog) need `role="dialog"`, Escape to close and focus trapping
- the item action menu in `PasswordItem` is only visible on mouse hover
- form inputs without associated labels (`UnlockScreen`, `AddPasswordModal`, Settings)

## Robustness (Rust)

| Item | Where | Size |
| :--- | :--- | :--- |
| `init_db(...).expect(...)` panics at startup with no message if the database cannot open. Show an error instead. | `src-tauri/src/lib.rs` | S 🟢 |
| `db.rs` logs per-record `eprintln!` lines and slices ids with `&id[..8]`, which can panic on a short id. Remove the logging. | `src-tauri/src/db.rs` | S 🟢 |
| `rows.flatten()` silently drops rows that fail to read. Return the error. | `src-tauri/src/db.rs` | S |
| The database commands are synchronous and do work on the main thread; move heavy ones to `spawn_blocking`. | `src-tauri/src/db.rs` | M |

## Cleanup 🟢

- Unused: `src/utils/crypto.ts` (stubs), `src/services/syncService.ts`, `src/App.css`, `public/tauri.svg`, and the `axios` dependency (the client is a custom Tauri fetch wrapper).
- `src/tests/Placeholder.test.ts` asserts nothing.
- Duplicate helpers: date formatting in three files, and two different password-strength scorers (`SecurityDashboardPage`, `PasswordGeneratorPage`).
- Generator: `array[i] % charset.length` has slight modulo bias, a selected character class is not guaranteed to appear, and the "select at least one type" message is stored in the password field.

## Test coverage

Covered today: login, register, `authService`, `totpService`, the HTTP client, sidebar, toasts, the add-entry modal, and the Rust crypto and commands.

Not covered (each is a good contribution, and the first two guard the riskiest code):

- `vaultService`: sync queue, conflict flow, offline behaviour
- `db.rs`: upserts, deletes, pending queue
- `App.tsx`: auto-lock, session revocation, clipboard clearing
- `UnlockScreen`, `SettingsPage` (export and import), `VaultPage`, `SecurityDashboardPage`, `AuditLogPage`, the generator, `DeviceManagement`, `ConflictResolver`, `RecoveryPage`

## Related design notes

[TODO_local_first_migration.md](TODO_local_first_migration.md) describes the planned move to a fully local-first sync engine. Parts of it overlap with the sync items above; some steps are still open.
