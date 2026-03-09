// ============================================================================
// Auth Service — Zero-Knowledge Authentication via Rust + Backend
// ============================================================================
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";

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
}

export const authService = {
    /**
     * Register a new user — keys generated in Rust (Zero Knowledge)
     */
    async register(email: string, masterPassword: string): Promise<string> {
        const verifyKeys = await invoke<RegisterResponse>("register_vault", {
            password: masterPassword,
        });

        await apiClient.post("/auth/register", {
            email,
            salt: verifyKeys.salt,
            wrapped_mek: verifyKeys.wrapped_mek,
            auth_hash: verifyKeys.auth_hash,
        });

        return verifyKeys.recovery_key;
    },

    /**
     * Step 1 of Login: Get authentication parameters (salt + wrapped MEK)
     */
    async getParams(email: string): Promise<AuthParams> {
        const response = await apiClient.get("/auth/params", { params: { email } });
        return response.data;
    },

    /**
     * Step 2 of Login: Derive keys in Rust, authenticate with backend.
     * Returns login result indicating if MFA is required.
     */
    async login(email: string, masterPassword: string): Promise<LoginResult> {
        // 1. Fetch Salt & Wrapped MEK
        const { salt, wrapped_mek } = await this.getParams(email);

        // 2. Derive Key & Unlock Vault in Rust
        const loginData = await invoke<LoginResponse>("login_vault", {
            password: masterPassword,
            salt,
            wrappedMek: wrapped_mek,
        });

        // 3. Send Auth Hash to Backend
        const response = await apiClient.post("/auth/login", {
            email,
            auth_hash: loginData.auth_hash,
        });

        // Check if MFA is required
        if (response.data?.mfa_required) {
            return {
                success: false,
                mfa_required: true,
                tempToken: response.data.tempToken,
            };
        }

        return { success: true };
    },

    /**
     * Logout — clear backend session + lock Rust vault
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post("/auth/logout");
        } catch (err) {
            console.error("Backend logout failed:", err);
        }
        try {
            await invoke("lock_vault");
        } catch (err) {
            console.error("Failed to lock vault:", err);
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
        await apiClient.post("/auth/register", {
            email,
            salt,
            wrapped_mek: newWrappedMek,
            auth_hash: loginData.auth_hash,
        });
    },
};
