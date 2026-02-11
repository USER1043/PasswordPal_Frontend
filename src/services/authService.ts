import api from './api';
import { invoke } from '@tauri-apps/api/core';

// Types matching Rust structs
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

export const authService = {
    /**
     * Step 1: Register a new user
     * - Key generation happens in Rust (Zero Knowledge)
     * - Public params sent to backend
     */
    async register(email: string, masterPassword: string): Promise<string> {
        // 1. Generate Keys locally in Rust
        console.log('Generating keys in Rust...');
        const verifyKeys = await invoke<RegisterResponse>('register_vault', { 
            password: masterPassword 
        });

        // 2. Send public params to Backend
        console.log('Registering with backend...');
        await api.post('/auth/register', {
            email,
            salt: verifyKeys.salt,
            wrapped_mek: verifyKeys.wrapped_mek,
            auth_hash: verifyKeys.auth_hash
        });

        return verifyKeys.recovery_key;
    },

    /**
     * Step 1 of Login: Get Params
     */
    async getParams(email: string): Promise<AuthParams> {
        const response = await api.get('/auth/params', { params: { email } });
        return response.data;
    },

    /**
     * Step 2 of Login: Derive Key & Authenticate
     */
    async login(email: string, masterPassword: string): Promise<void> {
        // 1. Fetch Salt & Wrapped MEK
        console.log('Fetching auth params...');
        const { salt, wrapped_mek } = await this.getParams(email);

        // 2. Derive Key & Unlock Vault in Rust
        // This validates the password locally by attempting to decrypt the MEK
        console.log('Deriving keys and unlocking vault...');
        const loginData = await invoke<LoginResponse>('login_vault', {
            password: masterPassword,
            salt,
            wrapped_mek
        });

        // 3. Send Auth Hash to Backend to prove identity
        console.log('Authenticating with backend...');
        await api.post('/auth/login', {
            email,
            auth_hash: loginData.auth_hash
        });
    }
};
