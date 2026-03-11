import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";
import { isServerReachable } from "./networkProbe";

export interface VaultEntry {
    name: string;
    username: string;
    folder_name: string;
    website_url: string;
    tags: string[];
    password: string;
    notes: string;
}

export interface DecryptedVaultRecord {
    id: string;
    entry: VaultEntry;
    version: number;
    sync_status: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
    record_type: string;
}

export interface SyncQueueItem {
    id: string;
    user_id: string;
    encrypted_data: string;
    nonce: string;
    version: number;
    sync_status: string;
    record_type: string;
}

function getActiveUserEmail(): string {
    return localStorage.getItem("active_user") || "unknown";
}

export let isSyncing = false;
let syncRequested = false;

/**
 * Pushes any pending SQLite modifications to the backend server.
 * Offline sync queue is driven by encrypted blobs safely extracted via Rust specifically for transmission.
 */
export async function syncOfflineVault(): Promise<void> {
    if (isSyncing) {
        syncRequested = true;
        return;
    }
    
    isSyncing = true;
    window.dispatchEvent(new Event('sync-start'));
    const userId = getActiveUserEmail();

    try {
        do {
            syncRequested = false;
            const pendingItems: SyncQueueItem[] = await invoke("get_pending_sync_queue", { userId });

            if (pendingItems.length === 0) break;
            
            console.log(`Syncing ${pendingItems.length} offline changes...`);

            for (const item of pendingItems) {
                const reachable = await isServerReachable();
                if (!reachable) {
                    console.warn("Network offline during sync. Breaking loop.");
                    syncRequested = false;
                    break;
                }

                try {
                    if (item.sync_status === 'pending_delete') {
                        await apiClient.delete(`/api/vault/${item.id}`);
                        await invoke("mark_deleted_local", { id: item.id, hardDelete: true });
                    } else {
                        const payload = {
                            id: item.id,
                            encrypted_data: item.encrypted_data,
                            nonce: item.nonce,
                            version: item.version,
                            record_type: item.record_type,
                        };
                        
                        await apiClient.post("/api/vault", payload);
                        await invoke("mark_synced_local", { id: item.id });
                    }
                } catch (err: unknown) {
                    const error = err as { message?: string; response?: { status?: number } };
                    if (error.message === "Network Error" || !error.response || error.response?.status === 503) {
                        console.warn("Network lost during sync (503/Backend DB Down). Aborting.");
                        syncRequested = false; // break outer loop if offline
                        break;
                    } else if (error.response?.status === 409) {
                        console.warn(`Version conflict syncing item ${item.id}. Awaiting manual resolution.`);

                        // 1. Download the server's version of the record
                        const serverRes = await apiClient.get(`/api/vault/${item.id}`);
                        const serverRecord = serverRes.data.item || serverRes.data.data || serverRes.data;

                        // 2. Decode local encrypted data
                        const nonceBytes = Uint8Array.from(atob(item.nonce), c => c.charCodeAt(0));
                        const cipherBytes = Uint8Array.from(atob(item.encrypted_data), c => c.charCodeAt(0));
                        const combined = new Uint8Array(nonceBytes.length + cipherBytes.length);
                        combined.set(nonceBytes);
                        combined.set(cipherBytes, nonceBytes.length);
                        const combinedB64 = btoa(String.fromCharCode(...combined));

                        // Decrypt local entry
                        const localEntry = await invoke<VaultEntry>("decrypt_entry", { blobB64: combinedB64 });

                        // 3. Decode server encrypted data
                        const serverNonceBytes = Uint8Array.from(atob(serverRecord.nonce), c => c.charCodeAt(0));
                        const serverCipherBytes = Uint8Array.from(atob(serverRecord.encrypted_data), c => c.charCodeAt(0));
                        const serverCombined = new Uint8Array(serverNonceBytes.length + serverCipherBytes.length);
                        serverCombined.set(serverNonceBytes);
                        serverCombined.set(serverCipherBytes, serverNonceBytes.length);
                        const serverCombinedB64 = btoa(String.fromCharCode(...serverCombined));
                        
                        // Decrypt server entry
                        const serverEntry = await invoke<VaultEntry>("decrypt_entry", { blobB64: serverCombinedB64 });

                        // 4. Pause the sync and wait for manual user resolution via ConflictContext overlay
                        const choice = await new Promise<'local' | 'server'>((resolve) => {
                            window.dispatchEvent(new CustomEvent('sync-conflict', {
                                detail: {
                                    serverData: serverEntry,
                                    localData: localEntry,
                                    recordId: item.id,
                                    serverVersion: serverRecord.version,
                                    resolve
                                }
                            }));
                        });

                        // 5. Resolution Logic
                        if (choice === 'local') {
                            const newVersion = serverRecord.version + 1;
                            // Re-submit the sync request with version = server_version + 1
                            const localPayload = {
                                id: item.id,
                                encrypted_data: item.encrypted_data, 
                                nonce: item.nonce,
                                version: newVersion,
                                record_type: item.record_type,
                            };
                            await apiClient.post("/api/vault", localPayload);
                            
                            // Update local DB to reflect the new version
                            await invoke("save_entry_local", {
                                entryId: item.id,
                                userId,
                                entry: localEntry,
                                version: newVersion,
                                recordType: item.record_type,
                                syncStatus: "synced"
                            });
                        } else {
                            // Overwrite the local SQLite record with the server's data
                            await invoke("save_server_record_local", {
                                id: item.id,
                                userId,
                                encryptedData: serverRecord.encrypted_data,
                                nonce: serverRecord.nonce,
                                version: serverRecord.version,
                                recordType: serverRecord.record_type || 'credential'
                            });
                        }
                    } else {
                        console.error(`Failed to sync item ${item.id}:`, err);
                    }
                }
            }
        } while (syncRequested);
    } finally {
        isSyncing = false;
        window.dispatchEvent(new Event('sync-complete'));
    }
}

/**
 * Fetch all records representing the user's vault safely.
 * Rust extracts the vault, natively decrypts using the Master Key, and bridges plaintext models to React.
 */
export async function fetchVault(): Promise<DecryptedVaultRecord[]> {
    const userId = getActiveUserEmail();

    try {
        await syncOfflineVault();
        const response = await apiClient.get("/api/vault");
        const serverRecords = response.data.items || response.data.data || response.data;

        // Persist synced records sequentially down to Rust
        for (const record of serverRecords) {
            if (record.is_deleted) {
                await invoke("mark_deleted_local", { id: record.id, hardDelete: true });
                continue;
            }

            // Push synced items down to Rust local vault to bypass React crypto
            await invoke("save_server_record_local", {
                id: record.id,
                userId,
                encryptedData: record.encrypted_data,
                nonce: record.nonce,
                version: record.version,
                recordType: record.record_type || 'credential'
            });
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
         if (err.message === "Network Error" || err.code === "ERR_NETWORK" || !err.response || err.response?.status === 503) {
            console.warn("Offline mode: Fetching natively from Rust local_vault.");
         } else {
            console.error("fetchVault backend error:", err);
            // Don't throw if we can still try to return local Rust data
         }
    }

    try {
        // Call Rust to retrieve the completely clean, decrypted list from local_vault
        return await invoke("fetch_vault_local", { userId });
    } catch (e) {
        console.error("Failed to fetch from local Rust DB:", e);
        return [];
    }
}

/**
 * Directs pure plaintext to backend Rust, where it is instantly encrypted in memory bounds.
 */
export async function saveEntry(
    data: VaultEntry,
    existingId?: string,
    version?: number,
    recordType: string = "credential",
): Promise<void> {
    const userId = getActiveUserEmail();
    const id = existingId || crypto.randomUUID();
    const activeVersion = version || 1;
    const syncStatus = existingId ? 'pending_update' : 'pending_insert';

    try {
        // 1. Instantly defer to Rust. Never encrypt in TS.
        await invoke("save_entry_local", {
            entryId: id,
            userId,
            entry: data,
            version: activeVersion,
            recordType,
            syncStatus
        });

        // 2. Trigger async sync process
        syncOfflineVault().catch((e) => console.error("Sync failed:", e));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error("Local database error:", err);
        // Alert the user instead of unhandled promise rejection crashing React
        alert(`Failed to save to local vault:\n${err.message || String(err)}`);
        throw err; // Re-throw so callers (e.g. React Query) can handle state properly
    }
}

/**
 * Soft-deletes vault securely in Rust first.
 */
export async function deleteEntry(id: string): Promise<void> {
    // 1. Rust logic ensures pending_delete sync status
    await invoke("mark_deleted_local", { id, hardDelete: false });

    // 2. Trigger sync process
    syncOfflineVault().catch(console.error);
}
