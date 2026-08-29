# TODO: Local-First Migration Plan

This document outlines the architectural plan for migrating PasswordPal to a **Local-First (Offline-First)** model on a future dedicated branch.

---

## Migration Objectives

1. **Local SQLite as Single Source of Truth**:
   - All user mutations (`create`, `edit`, `delete`) write **instantly** to local SQLite (`upsert_local_vault_record` / `mark_deleted_local`) for 0ms UI latency.
   - `fetchVault()` reads directly from local SQLite (`fetch_vault_local`) to render UI immediately without waiting for HTTP network calls.

2. **Decoupled Background Sync Engine**:
   - The sync engine reads pending queue items (`get_pending_sync_queue`) from SQLite.
   - Queue items already contain pre-encrypted payloads (`encrypted_data`, `nonce`), so the sync engine pushes them directly to `/api/vault/sync` without doing any frontend encryption/decryption.
   - Pulled server changes are saved directly into SQLite (`upsert_local_vault_record` with `sync_status = 'synced'`).

3. **Complete Un-exposure of `encrypt_entry` & `decrypt_entry`**:
   - Remove `encrypt_entry` and `decrypt_entry` IPC endpoints from `lib.rs`.
   - All encryption and decryption occurs natively inside Rust RAM during SQLite reads/writes.

---

## Planned Implementation Steps

- [ ] Create a new branch: `feature/local-first-migration`
- [ ] Refactor `fetchVault()` in `vaultService.ts` to return `fetch_vault_local` immediately and trigger `syncOfflineVault()` asynchronously.
- [ ] Refactor `pullChanges()` in `syncService.ts` to push server records directly to `upsert_local_vault_record`.
- [ ] Refactor `pushChange()` in `syncService.ts` to transmit pre-encrypted queue items directly without invoking `encrypt_entry`.
- [ ] Remove `encrypt_entry` and `decrypt_entry` from `lib.rs` (`generate_handler![]`).
- [ ] Add network state listener (`window.addEventListener('online')`) to trigger background sync automatically on reconnect.
