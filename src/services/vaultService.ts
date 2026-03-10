import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";

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

let isSyncing = false;
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
    const userId = getActiveUserEmail();

    try {
        do {
            syncRequested = false;
            const pendingItems: SyncQueueItem[] = await invoke("get_pending_sync_queue", { userId });

            if (pendingItems.length === 0) break;
            
            console.log(`Syncing ${pendingItems.length} offline changes...`);

            for (const item of pendingItems) {
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (err: any) {
                    if (err.message === "Network Error" || !err.response) {
                        console.warn("Network lost during sync. Aborting.");
                        syncRequested = false; // break outer loop if offline
                        break;
                    } else if (err.response?.status === 409) {
                        console.warn(`Version conflict syncing item ${item.id}. Reverting local change.`);
                        await invoke("mark_synced_local", { id: item.id });
                    } else {
                        console.error(`Failed to sync item ${item.id}:`, err);
                    }
                }
            }
        } while (syncRequested);
    } finally {
        isSyncing = false;
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
         if (err.message === "Network Error" || !err.response) {
            console.warn("Offline mode: Fetching natively from Rust local_vault.");
         } else {
            throw err;
         }
    }

    // Call Rust to retrieve the completely clean, decrypted list from local_vault
    return invoke("fetch_vault_local", { userId });
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
