// ============================================================================
// TOTP Service — MFA operations via backend /auth/totp/* endpoints
// ============================================================================
import apiClient from "../api/axiosClient";

export interface TotpSetupResponse {
    secret?: string;
    qrCodeUrl?: string;
    otpauth_url?: string;
    qrCode?: string;
}

export interface TotpStatusResponse {
    enabled: boolean;
}

export interface BackupCodesResponse {
    backupCodes: string[];
}

/**
 * Initiate TOTP setup — returns secret + QR code for scanning.
 */
export async function setupTotp(): Promise<TotpSetupResponse> {
    const response = await apiClient.post("/auth/totp/setup");
    return response.data;
}

/**
 * Verify TOTP setup with a code from authenticator app.
 */
export async function verifySetup(code: string, secret: string): Promise<BackupCodesResponse> {
    const response = await apiClient.post("/auth/totp/verify-setup", { code, secret });
    return response.data;
}

/**
 * Verify TOTP code during login (MFA challenge).
 */
export async function verifyLogin(code: string, tempToken?: string): Promise<void> {
    await apiClient.post("/auth/totp/verify-login", { code, tempToken });
}

/**
 * Check if TOTP MFA is enabled for current user.
 */
export async function getStatus(): Promise<TotpStatusResponse> {
    const response = await apiClient.get("/auth/totp/status");
    return { enabled: response.data.totp_enabled || false };
}

/**
 * Disable TOTP MFA (requires valid TOTP code).
 */
export async function disableTotp(code: string): Promise<void> {
    await apiClient.post("/auth/totp/disable", { code });
}

/**
 * Generate new backup recovery codes.
 */
export async function generateBackupCodes(): Promise<BackupCodesResponse> {
    const response = await apiClient.post("/auth/totp/backup-codes/generate");
    return response.data;
}

/**
 * Redeem a backup code (used during login if TOTP device unavailable).
 */
export async function redeemBackupCode(code: string, tempToken?: string): Promise<void> {
    await apiClient.post("/auth/totp/backup-codes/redeem", { code, tempToken });
}
