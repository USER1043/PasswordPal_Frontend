// ============================================================================
// Sync Service — Delta sync pull/push via backend /api/vault/sync endpoints
// ============================================================================
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";
import type { VaultEntry, VaultRecord, DecryptedVaultItem } from "./vaultService";

export interface SyncPullResponse {
    records: VaultRecord[];
    cursor: string | null;
    has_more: boolean;
}

export interface SyncConflict {
    record_id: string;
    server_version: number;
    client_version: number;
}

/**
 * Combine separate nonce + encrypted_data into single blob for Rust decryption
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
 * Split Rust blob into nonce + encrypted_data for backend
 */
function splitEncryptedBlob(blobB64: string): { nonce: string; encrypted_data: string } {
    const raw = Uint8Array.from(atob(blobB64), (c) => c.charCodeAt(0));
    return {
        nonce: btoa(String.fromCharCode(...raw.slice(0, 12))),
        encrypted_data: btoa(String.fromCharCode(...raw.slice(12))),
    };
}

/**
 * Pull changes from server since a given timestamp.
 */
export async function pullChanges(
    since?: string,
    cursor?: string
): Promise<{ items: DecryptedVaultItem[]; cursor: string | null; hasMore: boolean }> {
    const params: Record<string, string> = {};
    if (since) params.since = since;
    if (cursor) params.cursor = cursor;

    const response = await apiClient.get("/api/vault/sync", { params });
    const data: SyncPullResponse = response.data;

    const items: DecryptedVaultItem[] = [];
    for (const record of data.records) {
        try {
            const blob = combineToBlob(record.nonce, record.encrypted_data);
            const entry = await invoke<VaultEntry>("decrypt_entry", { blobB64: blob });
            items.push({
                ...entry,
                id: record.id,
                version: record.version,
                record_type: record.record_type,
                client_record_id: record.client_record_id,
                created_at: record.created_at,
                updated_at: record.updated_at,
            });
        } catch (err) {
            console.error(`Failed to decrypt synced record ${record.id}:`, err);
        }
    }

    return { items, cursor: data.cursor, hasMore: data.has_more };
}

/**
 * Push a single record change to the server.
 */
export async function pushChange(
    entry: VaultEntry,
    recordId?: string,
    version?: number,
    recordType: string = "credential",
    clientRecordId?: string,
    isDeleted: boolean = false
): Promise<{ success: boolean; conflict?: SyncConflict }> {
    const blobB64 = await invoke<string>("encrypt_entry", { entry });
    const { nonce, encrypted_data } = splitEncryptedBlob(blobB64);

    const payload: Record<string, unknown> = {
        encrypted_data,
        nonce,
        record_type: recordType,
        is_deleted: isDeleted,
    };

    if (recordId) payload.id = recordId;
    if (version !== undefined) payload.client_known_version = version;
    if (clientRecordId) payload.client_record_id = clientRecordId;

    try {
        await apiClient.post("/api/vault/sync", { records: [payload] });
        return { success: true };
    } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number, data?: unknown } };
        if (axiosErr.response?.status === 409) {
            return {
                success: false,
                conflict: axiosErr.response.data as SyncConflict,
            };
        }
        throw err;
    }
}
