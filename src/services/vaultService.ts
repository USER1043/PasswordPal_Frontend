// ============================================================================
// Vault Service — Encrypt/Decrypt via Rust + CRUD via Backend
// ============================================================================
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
 */
export async function fetchVault(): Promise<DecryptedVaultItem[]> {
    const response = await apiClient.get("/api/vault");
    const records: VaultRecord[] = response.data.items || response.data.data || response.data;

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
            });
        } catch (err) {
            console.error(`Failed to decrypt record ${record.id}:`, err);
        }
    }

    return decrypted;
}

/**
 * Encrypt an entry via Rust and save to backend.
 * If existingId + version provided, updates the existing record.
 */
export async function saveEntry(
    data: VaultEntry,
    existingId?: string,
    version?: number,
    recordType: string = "credential",
    clientRecordId?: string
): Promise<void> {
    // Encrypt via Rust — returns Base64(nonce | ciphertext)
    const blobB64 = await invoke<string>("encrypt_entry", { entry: data });
    const { nonce, encrypted_data } = splitEncryptedBlob(blobB64);

    const payload: Record<string, unknown> = {
        encrypted_data,
        nonce,
        record_type: recordType,
    };

    if (existingId) {
        payload.id = existingId;
        payload.version = version || 1;
    }

    if (clientRecordId) {
        payload.client_record_id = clientRecordId;
    }

    await apiClient.post("/api/vault", payload);
}

/**
 * Soft-delete a vault record.
 */
export async function deleteEntry(id: string): Promise<void> {
    await apiClient.delete(`/api/vault/${id}`);
}
