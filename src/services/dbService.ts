// ============================================================================
// src/services/dbService.ts - Local Database Management for Offline Mode
// Covers Epic 8 (Offline Access & Resilience)
// Includes SQLite schema initialization for zero-knowledge auth and vault caching
// ============================================================================
import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

/**
 * Sync status for offline vault items
 */
export type SyncStatus = 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';

/**
 * Internal representation of a cached vault item in SQLite
 */
export interface LocalVaultItem {
    id: string; // The backend UUID, or a temporary offline-generated UUID
    user_id: string;
    name: string;
    encrypted_data: string;
    nonce: string;
    version: number;
    sync_status: SyncStatus;
    updated_at: string;
}

/**
 * Initialize the SQLite local database connection and schema
 */
export async function initDB(): Promise<Database> {
    if (dbInstance) return dbInstance;

    dbInstance = await Database.load('sqlite:passwordpal.db');

    // 1. Auth Cache Table
    // We cache the Salt and Wrapped MEK so the user can derive their local decryption key
    // completely offline. This allows zero-knowledge decryption without internet.
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS auth_cache (
            email TEXT PRIMARY KEY,
            salt TEXT NOT NULL,
            wrapped_mek TEXT NOT NULL,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Local Vault Table
    // We cache the encrypted vault items for offline viewing.
    // The sync_status tracks if modifications were made while offline, 
    // to be synced back to the server when connection is restored.
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS local_vault (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            encrypted_data TEXT NOT NULL,
            nonce TEXT NOT NULL,
            version INTEGER NOT NULL,
            sync_status TEXT NOT NULL CHECK(sync_status IN ('synced', 'pending_insert', 'pending_update', 'pending_delete')),
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Index for quick fetching by user
    await dbInstance.execute(`
        CREATE INDEX IF NOT EXISTS idx_local_vault_user 
        ON local_vault (user_id)
    `);

    return dbInstance;
}

// ----------------------------------------------------------------------------
// AUTH CACHE METHODS
// ----------------------------------------------------------------------------

export async function cacheAuthParams(email: string, salt: string, wrappedMek: string): Promise<void> {
    const db = await initDB();
    await db.execute(
        `INSERT INTO auth_cache (email, salt, wrapped_mek, last_updated) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT(email) DO UPDATE SET 
         salt = excluded.salt, 
         wrapped_mek = excluded.wrapped_mek,
         last_updated = CURRENT_TIMESTAMP`,
        [email, salt, wrappedMek]
    );
}

export async function getCachedAuthParams(email: string): Promise<{ salt: string; wrapped_mek: string } | null> {
    const db = await initDB();
    const result = await db.select<{ salt: string; wrapped_mek: string }[]>(
        `SELECT salt, wrapped_mek FROM auth_cache WHERE email = $1`,
        [email]
    );
    return result.length > 0 ? result[0] : null;
}

// ----------------------------------------------------------------------------
// VAULT LOCAL CACHE METHODS
// ----------------------------------------------------------------------------

export async function getLocalVault(userId: string): Promise<LocalVaultItem[]> {
    const db = await initDB();
    return db.select<LocalVaultItem[]>(
        `SELECT * FROM local_vault 
         WHERE user_id = $1 AND sync_status != 'pending_delete' 
         ORDER BY updated_at DESC`,
        [userId]
    );
}

export async function clearLocalVaultCache(userId: string): Promise<void> {
    const db = await initDB();
    // Only clear synced items. Pending items must be kept until synced to server!
    await db.execute(
        `DELETE FROM local_vault WHERE user_id = $1 AND sync_status = 'synced'`,
        [userId]
    );
}

export async function upsertLocalVaultItem(item: LocalVaultItem): Promise<void> {
    const db = await initDB();
    await db.execute(
        `INSERT INTO local_vault (id, user_id, name, encrypted_data, nonce, version, sync_status, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO UPDATE SET 
            name = excluded.name,
            encrypted_data = excluded.encrypted_data,
            nonce = excluded.nonce,
            version = excluded.version,
            sync_status = excluded.sync_status,
            updated_at = excluded.updated_at`,
        [item.id, item.user_id, item.name, item.encrypted_data, item.nonce, item.version, item.sync_status, item.updated_at]
    );
}

export async function getPendingSyncItems(userId: string): Promise<LocalVaultItem[]> {
    const db = await initDB();
    return db.select<LocalVaultItem[]>(
        `SELECT * FROM local_vault 
         WHERE user_id = $1 AND sync_status != 'synced'`,
        [userId]
    );
}

export async function markItemSynced(id: string): Promise<void> {
    const db = await initDB();
    await db.execute(
        `UPDATE local_vault SET sync_status = 'synced' WHERE id = $1`,
        [id]
    );
}

export async function deleteLocalVaultItem(id: string, hardDelete = false): Promise<void> {
    const db = await initDB();
    if (hardDelete) {
        await db.execute(`DELETE FROM local_vault WHERE id = $1`, [id]);
    } else {
        await db.execute(`UPDATE local_vault SET sync_status = 'pending_delete' WHERE id = $1`, [id]);
    }
}
