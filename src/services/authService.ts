// ============================================================================
// Auth Service - Zero-Knowledge Authentication via Rust + Backend
// ============================================================================
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";
import { isServerReachable } from "./networkProbe";

// Reusable network error classifier
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNetworkFailure(err: any): boolean {
    return (
        !err.response ||
        err.response.status === 503 || // Service Unavailable (triggered by DB disconnects)
        err.code === "ERR_NETWORK" ||
        err.code === "ECONNABORTED" ||
        err.code === "ECONNREFUSED" ||
        err.message?.toLowerCase().includes("network error")
    );
}

// ============================================================================
// Sensitive State Callback Registry
// Components (LoginPage, SettingsPage, etc.) register their setPassword("")
// callbacks here on mount and unregister on unmount. The logout() function
// fires all of them to guarantee no plaintext password lingers in any
// mounted component's React state after logout.
// ============================================================================
const sensitiveStateCallbacks = new Set<() => void>();

export function registerSensitiveStateCallback(cb: () => void): void {
    sensitiveStateCallbacks.add(cb);
}

export function unregisterSensitiveStateCallback(cb: () => void): void {
    sensitiveStateCallbacks.delete(cb);
}

function clearAllSensitiveState(): void {
    sensitiveStateCallbacks.forEach(cb => {
        try { cb(); } catch { /* never let a component callback abort the logout */ }
    });
}

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
    wrapped_mek?: string;
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
     * Register a new user - keys generated in Rust (Zero Knowledge)
     */
    async register(email: string, masterPassword: string): Promise<string> {
        const verifyKeys = await invoke<RegisterResponse>("register_vault", {
            password: masterPassword,
        });

        // SECURITY: Hash recovery key using Argon2id with consistent security parameters
        // Memory (m): 64 MiB, Time/Iterations (t): 3 passes, Parallelism (p): 4 lanes/threads
        const recoveryKeyHash = await invoke<string>("hash_recovery_key_command", {
            recoveryKey: verifyKeys.recovery_key,
        });

        await apiClient.post("/auth/register", {
            email,
            salt: verifyKeys.salt,
            wrapped_mek: verifyKeys.wrapped_mek,
            auth_hash: verifyKeys.auth_hash,
            recovery_key_hash: recoveryKeyHash,
        });

        await cacheAuthParams(email, verifyKeys.salt, verifyKeys.wrapped_mek, verifyKeys.auth_hash);

        return verifyKeys.recovery_key;
    },

    /**
     * Step 1 of Login: Get authentication parameters (salt only when online)
     */
    async getParams(email: string): Promise<AuthParams> {
        const getOfflineParams = async () => {
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
            throw new Error("No offline login data available for this email.");
        };

        const online = await isServerReachable();

        if (!online) {
            console.warn("[Auth] Probe failed - entering offline mode for getParams");
            return getOfflineParams();
        }

        try {
            const response = await apiClient.get("/auth/params", { params: { email } }) as ApiResponse<AuthParams>;
            return response.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (isNetworkFailure(err)) {
                console.warn("[Auth] Axios failed after probe - race condition fallback");
                return getOfflineParams();
            }
            throw err; // 401, 404, 500 etc - real server error, bubble it up
        }
    },

    /**
     * Step 2 of Login: Derive auth_hash in Rust, authenticate with backend.
     * On successful authentication, server returns wrapped_mek to unlock Rust vault.
     * Returns login result indicating if MFA is required or if it's Offline Mode.
     */
    async login(email: string, masterPassword: string, deviceFingerprint?: string): Promise<LoginResult> {
        const params = await this.getParams(email);
        const { salt } = params;
        const localWrappedMek = params.wrapped_mek;
        const localPasswordHash = (params as unknown as Record<string, unknown>).local_password_hash as string | undefined;

        let finalDeviceName = deviceFingerprint || "Unknown Device";
        try {
            const identity = await invoke<{device_id: string, device_name: string}>("get_local_identity");
            // Formats to: linux/prajan-karthik (ID: 123e4567-e89b-12d3... )
            finalDeviceName = `${identity.device_name} (ID: ${identity.device_id})`;
        } catch (e) {
            console.error("Failed to fetch persistent device identity from SQLite:", e);
        }

        const online = await isServerReachable();

        if (!online) {
            console.warn("[Auth] Probe failed - entering offline mode for login");
            if (!localWrappedMek) {
                throw new Error("No offline login data available for this email.");
            }
            const loginData = await invoke<LoginResponse>("login_vault", {
                password: masterPassword,
                salt,
                wrappedMek: localWrappedMek,
            });
            if (localPasswordHash && localPasswordHash === loginData.auth_hash) {
                localStorage.setItem("active_user", email);
                localStorage.setItem("offline_token", "mock-offline-token-" + Date.now());
                return { success: true, isOfflineMode: true };
            } else {
                throw new Error("Invalid offline master password signature.");
            }
        }

        // Online Mode: Derive auth_hash in Rust without requiring wrapped_mek
        let derivedAuthHash: string;
        try {
            derivedAuthHash = await invoke<string>("derive_auth_hash", {
                password: masterPassword,
                salt,
            });
        } catch (err) {
            console.error("Failed to derive auth hash:", err);
            throw err;
        }

        try {
            const headers: Record<string, string> = { "User-Agent": finalDeviceName };

            const response = await apiClient.post("/auth/login", {
                email,
                auth_hash: derivedAuthHash,
            }, { headers }) as ApiResponse<{ mfa_required?: boolean; tempToken?: string; wrapped_mek?: string }>;

            const serverWrappedMek = response.data?.wrapped_mek || localWrappedMek;

            if (serverWrappedMek) {
                // Password authenticated by server; unwrap MEK and unlock vault state in Rust
                await invoke<LoginResponse>("login_vault", {
                    password: masterPassword,
                    salt,
                    wrappedMek: serverWrappedMek,
                });
                await cacheAuthParams(email, salt, serverWrappedMek, derivedAuthHash);
            }

            if (response.data?.mfa_required) {
                return {
                    success: false,
                    mfa_required: true,
                    tempToken: response.data.tempToken,
                };
            }

            localStorage.setItem("active_user", email);
            localStorage.removeItem("offline_token");

            return { success: true, isOfflineMode: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
             if (isNetworkFailure(err) && localWrappedMek) {
                 console.warn("[Auth] Axios failed after probe - race condition fallback");
                 const loginData = await invoke<LoginResponse>("login_vault", {
                     password: masterPassword,
                     salt,
                     wrappedMek: localWrappedMek,
                 });
                 if (localPasswordHash && localPasswordHash === loginData.auth_hash) {
                     localStorage.setItem("active_user", email);
                     localStorage.setItem("offline_token", "mock-offline-token-" + Date.now());
                     return { success: true, isOfflineMode: true };
                 }
             }
             throw err;
        }
    },

    /**
     * Logout - Scorched Earth: clear backend session + lock Rust vault + clear local SQLite DB
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

        // 2b. Fire all registered component-level sensitive state callbacks
        // (e.g. setPassword("") in LoginPage, SettingsPage, etc.)
        clearAllSensitiveState();

        // 3. Lock memory in Rust
        try {
            await invoke("lock_vault");
        } catch (err) {
            console.error("Failed to lock vault:", err);
        }

        // 4. Preserve local SQLite cache for Offline Mode
        // We DO NOT call clear_local_auth_cache() here anymore.
        // The SQLite database stores encrypted records securely at rest. By preserving it,
        // the user will be able to log in natively using their offline cache when they return.
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
     * Change master password - re-wraps MEK with new password via Rust
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
