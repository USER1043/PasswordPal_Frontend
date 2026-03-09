// ============================================================================
// Device Management Service — Real API calls to backend
// ============================================================================
import apiClient from "../api/axiosClient";

export interface Device {
    id: string;
    device_name: string;
    last_login: string;
    user_id: string;
    isCurrent?: boolean;
}

/**
 * Get current device information
 */
export function getCurrentDeviceInfo(): { name: string; type: string } {
    const platform = navigator.platform.toLowerCase();
    let type = "windows";

    if (platform.includes("mac")) type = "macos";
    else if (platform.includes("linux")) type = "linux";

    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} Desktop`;
    return { name, type };
}

/**
 * Fetch all devices for the current user
 */
export async function getDevices(): Promise<Device[]> {
    try {
        const response = await apiClient.get("/api/devices");
        return response.data.devices || response.data || [];
    } catch (error) {
        console.error("Failed to fetch devices:", error);
        return [];
    }
}

/**
 * Revoke a device session
 */
export async function revokeDevice(deviceId: string): Promise<void> {
    await apiClient.post(`/api/devices/${deviceId}/revoke`);
}

/**
 * Register current device after login
 */
export async function registerDevice(): Promise<void> {
    const deviceInfo = getCurrentDeviceInfo();
    try {
        await apiClient.post("/api/devices/register", deviceInfo);
    } catch (error) {
        // Device registration might not have a dedicated backend endpoint yet
        // The backend creates device entries during login in auth.js
        console.warn("Device registration endpoint not available:", error);
    }
}
