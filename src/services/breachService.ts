// ============================================================================
// Breach Service — HIBP k-Anonymity password check via backend proxy
// ============================================================================
import apiClient from "../api/axiosClient";

export interface BreachResult {
    breached: boolean;
    count: number;
}

/**
 * Check if a password appears in known data breaches using HIBP k-Anonymity model.
 * 1. SHA-1 hash the password locally
 * 2. Send first 5 hex chars to backend proxy
 * 3. Compare remaining suffix against response
 */
export async function checkPasswordBreach(password: string): Promise<BreachResult> {
    // SHA-1 hash the password using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    try {
        const response = await apiClient.get(`/api/breach/${prefix}`);
        const responseText: string = response.data;

        // Parse HIBP response: each line is "SUFFIX:COUNT"
        const lines = responseText.split("\n");
        for (const line of lines) {
            const [hashSuffix, countStr] = line.trim().split(":");
            if (hashSuffix && hashSuffix.toUpperCase() === suffix) {
                return { breached: true, count: parseInt(countStr, 10) || 0 };
            }
        }

        return { breached: false, count: 0 };
    } catch (error) {
        console.error("Breach check failed:", error);
        return { breached: false, count: 0 };
    }
}
