// ============================================================================
// Auth Service — Zero-Knowledge Authentication via Rust + Backend
// ============================================================================
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";

async function cacheAuthParams(email: string, salt: string, wrapped_mek: string, auth_hash: string = "") {
    try {
        await invoke("cache_auth_params", {
            email,
            salt,
            wrappedMek: wrapped_mek,
            localPasswordHash: auth_hash
        });
    } catch (e) {
        console.error("Failed to cache auth params natively:", e);
    }
}

export interface RegisterResponse {
    salt: string;
    wrapped_mek: string;
    auth_hash: string;
    recovery_key: string;
}

export interface LoginResponse {
    auth_hash: string;
}

export interface AuthParams {
    salt: string;
    wrapped_mek: string;
}

export interface LoginResult {
    success: boolean;
    mfa_required?: boolean;
    tempToken?: string;
    isOfflineMode?: boolean;
}

interface ApiResponse<T = Record<string, unknown>> {
    data: T;
    status: number;
}

export const authService = {
    /**
     * Register a new user — keys generated in Rust (Zero Knowledge)
     */
    async register(email: string, masterPassword: string): Promise<string> {
        const verifyKeys = await invoke<RegisterResponse>("register_vault", {
            password: masterPassword,
        });

        // Hash the recovery key (raw MEK base64) with SHA-256 so the backend
        // can verify it later without ever seeing the raw key.
        const recoveryKeyBytes = new TextEncoder().encode(verifyKeys.recovery_key);
        const hashBuffer = await crypto.subtle.digest("SHA-256", recoveryKeyBytes);
        const recoveryKeyHash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        await apiClient.post("/auth/register", {
            email,
            salt: verifyKeys.salt,
            wrapped_mek: verifyKeys.wrapped_mek,
            auth_hash: verifyKeys.auth_hash,
            recovery_key_hash: recoveryKeyHash,
        });

        // Cache the params locally instantly so offline mode works immediately after registration
        await cacheAuthParams(email, verifyKeys.salt, verifyKeys.wrapped_mek, verifyKeys.auth_hash);

        return verifyKeys.recovery_key;
    },

    /**
     * Step 1 of Login: Get authentication parameters (salt + wrapped MEK)
     */
    async getParams(email: string): Promise<AuthParams> {
        try {
            const response = await apiClient.get("/auth/params", { params: { email } }) as ApiResponse<AuthParams>;
            return response.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            // If the network is down or API fails, try the SQLite offline cache
            if (err.message === "Network Error" || !err.response) {
                console.warn("Offline mode: Fetching auth params from native SQLite cache");
                try {
                    const cached = await invoke<{ salt: string; wrapped_mek: string; local_password_hash: string }>("get_cached_auth_params", { email });
                    if (cached) {
                        return { 
                            salt: cached.salt, 
                            wrapped_mek: cached.wrapped_mek,
                            local_password_hash: cached.local_password_hash
                        } as AuthParams & { local_password_hash: string };
                    }
                } catch (dbErr) {
                    console.error("No offline auth params found:", dbErr);
                }
            }
            throw err;
        }
    },

    /**
     * Step 2 of Login: Derive keys in Rust, authenticate with backend.
     * Returns login result indicating if MFA is required or if it's Offline Mode.
     */
    async login(email: string, masterPassword: string, deviceFingerprint?: string): Promise<LoginResult> {
        // 1. Fetch Salt & Wrapped MEK (online or offline fallback)
        const params = await this.getParams(email);
        const { salt, wrapped_mek } = params;
        const localPasswordHash = (params as unknown as Record<string, unknown>).local_password_hash as string | undefined;

        // 2. Derive Key & Unlock Vault in Rust
        let loginData: LoginResponse;
        try {
            loginData = await invoke<LoginResponse>("login_vault", {
                password: masterPassword,
                salt,
                wrappedMek: wrapped_mek,
            });
        } catch (err) {
            // ZERO-KNOWLEDGE AUDIT FIX:
            // If local decryption fails (wrong password), the backend is never natively reached.
            // We must intentionally hit /auth/login with a bogus hash so the backend
            // records the failed attempt in the Audit Log and triggers rate-limiting.
            const headers: Record<string, string> = {};
            if (deviceFingerprint) headers["User-Agent"] = deviceFingerprint;
            await apiClient.post("/auth/login", {
                email,
                auth_hash: "LOCAL_DECRYPTION_FAILED",
            }, { headers }).catch(() => {}); // Suppress the 401/Network response
            throw err; // Re-throw the Rust error for the UI to catch
        }

        // 3. Send Auth Hash to Backend
        try {
            const headers: Record<string, string> = {};
            if (deviceFingerprint) {
                // The backend uses req.headers['user-agent'] for the deviceName/fingerprint in deviceModel.js 
                // We override User-Agent here for fresh login isolations
                headers["User-Agent"] = deviceFingerprint;
            }

            const response = await apiClient.post("/auth/login", {
                email,
                auth_hash: loginData.auth_hash,
            }, { headers }) as ApiResponse<{ mfa_required?: boolean; tempToken?: string }>;

            // Check if MFA is required FIRST
            if (response.data?.mfa_required) {
                return {
                    success: false,
                    mfa_required: true,
                    tempToken: response.data.tempToken,
                };
            }

            // If online login succeeds and no MFA needed, cache the latest params for future offline use
            await cacheAuthParams(email, salt, wrapped_mek, loginData.auth_hash);
            localStorage.setItem("active_user", email);
            localStorage.removeItem("offline_token");

            return { success: true, isOfflineMode: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
             // If local decryption succeeded, but the network is completely down, log in Offline Mode
             if (err.message === "Network Error" || err.message === "Failed to fetch" || !err.response) {
                 // Offline Key Derivation Verification
                 if (localPasswordHash && localPasswordHash === loginData.auth_hash) {
                     localStorage.setItem("active_user", email);
                     
                     // Token Mocking: Set a mock offline token in Auth Context (localStorage)
                     localStorage.setItem("offline_token", "mock-offline-token-" + Date.now());
                     
                     return { success: true, isOfflineMode: true };
                 } else {
                     throw new Error("Invalid offline master password signature.");
                 }
             }
             throw err;
        }
    },

    /**
     * Logout — Scorched Earth: clear backend session + lock Rust vault + clear local SQLite DB
     */
    async logout(): Promise<void> {
        // 1. Explicitly clear backend HttpOnly cookies first
        try {
            await apiClient.post("/auth/logout");
        } catch (err) {
            console.error("Backend logout failed:", err);
        }

        // 2. Clear all sensitive local storage
        localStorage.removeItem("offline_token");
        localStorage.removeItem("active_user");
        sessionStorage.clear();

        // 3. Lock memory in Rust
        try {
            await invoke("lock_vault");
        } catch (err) {
            console.error("Failed to lock vault:", err);
        }

        // 4. Destroy local SQLite cache for complete Account Isolation
        try {
            await invoke("clear_local_auth_cache");
        } catch (err) {
            console.error("Failed to clear local SQLite caches:", err);
        }
    },

    /**
     * Refresh access token using refresh token cookie
     */
    async refreshToken(): Promise<boolean> {
        try {
            await apiClient.post("/auth/refresh");
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Verify password for sensitive actions (step-up auth)
     */
    async verifyPassword(email: string, masterPassword: string): Promise<void> {
        const { salt, wrapped_mek } = await this.getParams(email);

        const loginData = await invoke<LoginResponse>("login_vault", {
            password: masterPassword,
            salt,
            wrappedMek: wrapped_mek,
        });

        await apiClient.post("/auth/verify-password", {
            email,
            auth_hash: loginData.auth_hash,
        });
    },

    /**
     * Change master password — re-wraps MEK with new password via Rust
     */
    async changePassword(
        email: string,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        const { salt, wrapped_mek } = await this.getParams(email);

        const newWrappedMek = await invoke<string>("change_password_optimization", {
            encryptedMekBlob: wrapped_mek,
            oldPassword,
            newPassword,
            salt,
        });

        // Derive new auth hash from new password
        const loginData = await invoke<LoginResponse>("login_vault", {
            password: newPassword,
            salt,
            wrappedMek: newWrappedMek,
        });

        // Update server with new wrapped MEK and auth hash
        await apiClient.post("/auth/change-password", {
            salt,
            wrapped_mek: newWrappedMek,
            auth_hash: loginData.auth_hash,
        });
    },
};
