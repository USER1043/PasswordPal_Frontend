// ============================================================================
// Device Management Service - Real API calls to backend
// ============================================================================
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";

export interface Device {
    id: string;
    device_name: string;
    last_login: string;
    user_id: string;
    is_blocked?: boolean;
    isCurrent?: boolean;
}

export interface DeviceIdentity {
    device_id: string;
    device_name: string;
}

const BROWSER_DEVICE_ID_KEY = "passwordpal_persistent_device_id";

/**
 * Retrieve or generate a persistent, idempotent device identity.
 * In Tauri desktop mode, gets the device identity stored in SQLite (local_config).
 * In Web Browser mode, gets or generates a persistent device UUID in localStorage.
 */
export async function getPersistentDeviceIdentity(): Promise<DeviceIdentity> {
    try {
        const identity = await invoke<DeviceIdentity>("get_local_identity");
        if (identity && identity.device_id) {
            return identity;
        }
    } catch {
        // Fallback for browser environment where Tauri invoke is unavailable
    }

    let deviceId = localStorage.getItem(BROWSER_DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(BROWSER_DEVICE_ID_KEY, deviceId);
    }

    const platform = (navigator.platform || "").toLowerCase();
    let osName = "Web Browser";
    if (platform.includes("mac")) osName = "macOS Browser";
    else if (platform.includes("linux")) osName = "Linux Browser";
    else if (platform.includes("win")) osName = "Windows Browser";

    return {
        device_id: deviceId,
        device_name: osName,
    };
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
    await apiClient.post(`/api/devices/${deviceId}/revoke`, {});
}

/**
 * Block a device from this account. Also ends its current session.
 */
export async function blockDevice(deviceId: string): Promise<void> {
    await apiClient.post(`/api/devices/${deviceId}/block`, {});
}

/**
 * Lift a block so the device can log in again.
 */
export async function unblockDevice(deviceId: string): Promise<void> {
    await apiClient.post(`/api/devices/${deviceId}/unblock`, {});
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

