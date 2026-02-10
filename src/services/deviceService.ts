// ============================================================================
// src/services/deviceService.ts - Device Management Service
// ============================================================================
import axiosClient from "../api/axiosClient";

export interface Device {
    id: string;
    name: string;
    type: "windows" | "macos" | "linux";
    lastActive: string;
    isCurrent: boolean;
}

/**
 * Get current device information
 */
export function getCurrentDeviceInfo(): {
    name: string;
    type: "windows" | "macos" | "linux";
} {
    // Detect OS
    const platform = navigator.platform.toLowerCase();
    let type: "windows" | "macos" | "linux" = "windows";

    if (platform.includes("mac")) type = "macos";
    else if (platform.includes("linux")) type = "linux";

    // Generate device name
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} Desktop`;

    return { name, type };
}

/**
 * Register device on login
 * TODO: Implement actual API call
 */
export async function registerDevice(): Promise<void> {
    console.log("[PLACEHOLDER] Registering device...");

    const deviceInfo = getCurrentDeviceInfo();

    // TODO: Implement actual API call
    // await axiosClient.post('/devices/register', deviceInfo);

    // Mock implementation
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Device registered:", deviceInfo);
}

/**
 * Get list of active devices
 * TODO: Implement actual API call
 */
export async function getDevices(): Promise<Device[]> {
    console.log("[PLACEHOLDER] Fetching devices...");

    // TODO: Implement actual API call
    // const response = await axiosClient.get('/devices');
    // return response.data;

    // Mock implementation
    await new Promise((resolve) => setTimeout(resolve, 500));

    const currentDevice = getCurrentDeviceInfo();
    return [
        {
            id: "1",
            name: currentDevice.name,
            type: currentDevice.type,
            lastActive: new Date().toISOString(),
            isCurrent: true,
        },
        {
            id: "2",
            name: "Windows Desktop",
            type: "windows",
            lastActive: new Date(Date.now() - 86400000).toISOString(),
            isCurrent: false,
        },
    ];
}

/**
 * Revoke a specific device
 * TODO: Implement actual API call
 */
export async function revokeDevice(deviceId: string): Promise<void> {
    console.log("[PLACEHOLDER] Revoking device:", deviceId);

    // TODO: Implement actual API call
    // await axiosClient.post(`/devices/${deviceId}/revoke`);

    // Mock implementation
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Device revoked:", deviceId);
}
