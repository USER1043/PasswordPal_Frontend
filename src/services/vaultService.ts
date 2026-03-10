// ============================================================================
// Vault Service — Encrypt/Decrypt via Rust + CRUD via Backend
// ============================================================================
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";
import { 
    getLocalVault, 
    clearLocalVaultCache, 
    upsertLocalVaultItem, 
    deleteLocalVaultItem, 
    markItemSynced,
    getPendingSyncItems
} from "./dbService";

export interface VaultEntry {
    name: string;
    username: string;
    folder_name: string;
    website_url: string;
    tags: string[];
    password: string;
    notes: string;
}

export interface VaultRecord {
    id: string;
    encrypted_data: string;
    nonce: string;
    version: number;
    is_deleted: boolean;
    record_type: string;
    client_record_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface DecryptedVaultItem extends VaultEntry {
    id: string;
    version: number;
    record_type: string;
    client_record_id: string | null;
    created_at: string;
    updated_at: string;
    // Track if this item hasn't been synced to the server yet
    isPendingSync?: boolean; 
}

function getActiveUserEmail(): string {
    return localStorage.getItem("active_user") || "unknown";
}

/**
 * Pushes any pending local SQLite modifications (inserts, updates, deletes)
 * to the backend server. Should be called when the internet connection is restored.
 */
export async function syncOfflineVault(): Promise<void> {
    const userId = getActiveUserEmail();
    const pendingItems = await getPendingSyncItems(userId);

    if (pendingItems.length === 0) return;
    
    console.log(`Syncing ${pendingItems.length} offline changes...`);

    for (const item of pendingItems) {
        try {
            if (item.sync_status === 'pending_delete') {
                await apiClient.delete(`/api/vault/${item.id}`);
                await deleteLocalVaultItem(item.id, true);
            } else {
                // pending_insert or pending_update
                const payload = {
                    id: item.id,
                    encrypted_data: item.encrypted_data,
                    nonce: item.nonce,
                    version: item.version,
                    record_type: item.name, // Stored type in 'name' column
                };
                await apiClient.post("/api/vault", payload);
                await markItemSynced(item.id);
            }
        } catch (err: any) {
            // If offline, stop syncing and try again later
            if (err.message === "Network Error" || !err.response) {
                console.warn("Network lost during sync. Aborting.");
                break;
            } else if (err.response?.status === 409) {
                // Version conflict — in a full implementation, we might try to merge.
                // For now, we abandon the local edit and just use the server version.
                console.warn(`Version conflict syncing item ${item.id}. Reverting local change.`);
                await markItemSynced(item.id); // Forcing synced will let fetchVault overwrite it
            } else {
                console.error(`Failed to sync item ${item.id}:`, err);
            }
        }
    }
}

/**
 * Combine separate nonce + encrypted_data into the single Base64 blob
 * that the Rust decrypt_entry command expects: Base64(nonce_bytes | ciphertext_bytes)
 */
function combineToBlob(nonceB64: string, encDataB64: string): string {
    const nonceBytes = Uint8Array.from(atob(nonceB64), (c) => c.charCodeAt(0));
    const dataBytes = Uint8Array.from(atob(encDataB64), (c) => c.charCodeAt(0));
    const combined = new Uint8Array(nonceBytes.length + dataBytes.length);
    combined.set(nonceBytes, 0);
    combined.set(dataBytes, nonceBytes.length);
    return btoa(String.fromCharCode(...combined));
}

/**
 * Split a Rust-returned Base64(nonce|ciphertext) blob into separate nonce and encrypted_data,
 * each Base64-encoded, matching the backend schema.
 */
function splitEncryptedBlob(blobB64: string): { nonce: string; encrypted_data: string } {
    const raw = Uint8Array.from(atob(blobB64), (c) => c.charCodeAt(0));
    const nonceBytes = raw.slice(0, 12);
    const cipherBytes = raw.slice(12);
    return {
        nonce: btoa(String.fromCharCode(...nonceBytes)),
        encrypted_data: btoa(String.fromCharCode(...cipherBytes)),
    };
}

/**
 * Fetch all vault records from backend and decrypt each via Rust.
 * Falls back to local SQLite cache if offline.
 */
export async function fetchVault(): Promise<DecryptedVaultItem[]> {
    const userId = getActiveUserEmail();
    let records: VaultRecord[] = [];

    try {
        await syncOfflineVault();
        const response = await apiClient.get("/api/vault");
        records = response.data.items || response.data.data || response.data;

        // Save fresh records to SQLite cache for future offline access
        await clearLocalVaultCache(userId);
        for (const record of records) {
            if (record.is_deleted) continue;
            await upsertLocalVaultItem({
                id: record.id,
                user_id: userId,
                name: record.record_type, // Storing type as temporary name for cache
                encrypted_data: record.encrypted_data,
                nonce: record.nonce,
                version: record.version,
                sync_status: 'synced',
                updated_at: record.updated_at || new Date().toISOString()
            });
        }
    } catch (err: any) {
        if (err.message === "Network Error" || !err.response) {
            console.warn("Offline mode: Reading vault from local SQLite cache.");
            const cachedItems = await getLocalVault(userId);
            records = cachedItems.map(item => ({
                id: item.id,
                encrypted_data: item.encrypted_data,
                nonce: item.nonce,
                version: item.version,
                is_deleted: false,
                record_type: item.name, // Revert name mapping hack
                client_record_id: null,
                created_at: item.updated_at,
                updated_at: item.updated_at,
                isPendingSync: item.sync_status !== 'synced'
            }) as VaultRecord & { isPendingSync?: boolean });
        } else {
            throw err;
        }
    }

    const decrypted: DecryptedVaultItem[] = [];

    for (const record of records) {
        if (record.is_deleted) continue;

        try {
            const blob = combineToBlob(record.nonce, record.encrypted_data);
            const entry = await invoke<VaultEntry>("decrypt_entry", { blobB64: blob });

            decrypted.push({
                ...entry,
                id: record.id,
                version: record.version,
                record_type: record.record_type,
                client_record_id: record.client_record_id,
                created_at: record.created_at,
                updated_at: record.updated_at,
                isPendingSync: (record as any).isPendingSync 
            });
        } catch (err) {
            console.error(`Failed to decrypt record ${record.id}:`, err);
        }
    }

    return decrypted;
}

/**
 * Encrypt an entry via Rust and save to SQLite + backend.
 * Uses a local-first approach.
 */
export async function saveEntry(
    data: VaultEntry,
    existingId?: string,
    version?: number,
    recordType: string = "credential",
    clientRecordId?: string
): Promise<void> {
    const userId = getActiveUserEmail();
    const id = existingId || crypto.randomUUID(); // Generate offline ID if new
    const activeVersion = version || 1;

    // Encrypt via Rust — returns Base64(nonce | ciphertext)
    const blobB64 = await invoke<string>("encrypt_entry", { entry: data });
    const { nonce, encrypted_data } = splitEncryptedBlob(blobB64);

    // 1. Commit to Local SQLite Cache Immediately (Pending Sync)
    await upsertLocalVaultItem({
        id,
        user_id: userId,
        name: recordType,
        encrypted_data,
        nonce,
        version: activeVersion,
        sync_status: existingId ? 'pending_update' : 'pending_insert',
        updated_at: new Date().toISOString()
    });

    // 2. Try to sync to backend
    const payload: Record<string, unknown> = {
        id, // Send our generated ID to the server
        encrypted_data,
        nonce,
        version: activeVersion,
        record_type: recordType,
        client_record_id: clientRecordId,
    };

    try {
        await apiClient.post("/api/vault", payload);
        // 3. Mark as Synced on Success
        await markItemSynced(id);
    } catch (err: any) {
        // If it was a network error, do not throw. The app keeps working offline.
        if (err.message === "Network Error" || !err.response) {
            console.warn(`Saved entry ${id} offline. Will sync when reconnected.`);
        } else {
            // Re-throw genuine backend errors (like 409 Version Conflict)
            throw err;
        }
    }
}

/**
 * Soft-delete a vault record.
 * Local-First approach.
 */
export async function deleteEntry(id: string): Promise<void> {
    // 1. Mark as pending_delete locally first
    await deleteLocalVaultItem(id, false);

    try {
        // 2. Try to sync to backend
        await apiClient.delete(`/api/vault/${id}`);
        // 3. Hard delete locally on success
        await deleteLocalVaultItem(id, true);
    } catch (err: any) {
        if (err.message === "Network Error" || !err.response) {
             console.warn(`Deleted entry ${id} offline. Will sync when reconnected.`);
        } else {
             throw err;
        }
    }
}
