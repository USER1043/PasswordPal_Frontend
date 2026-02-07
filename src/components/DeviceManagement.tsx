// ============================================================================
// src/components/DeviceManagement.tsx - Device Management Component
// ============================================================================
import { useState, useEffect } from "react";
import { Monitor, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { getDevices, revokeDevice, type Device } from "../services/deviceService";

export default function DeviceManagement() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState<string | null>(null);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        setLoading(true);
        try {
            const deviceList = await getDevices();
            setDevices(deviceList);
        } catch (error) {
            console.error("Failed to load devices:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (deviceId: string) => {
        setRevoking(deviceId);
        try {
            await revokeDevice(deviceId);
            await loadDevices();
            setShowConfirm(null);
        } catch (error) {
            console.error("Failed to revoke device:", error);
        } finally {
            setRevoking(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const getDeviceIcon = (type: string) => {
        return Monitor; // Could expand with different icons per OS
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Active Devices</h2>
                <p className="text-slate-400">
                    Manage devices that have access to your vault
                </p>
            </div>

            <div className="space-y-3">
                {devices.map((device) => {
                    const DeviceIcon = getDeviceIcon(device.type);
                    return (
                        <div
                            key={device.id}
                            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                        <DeviceIcon className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold">
                                                {device.name}
                                            </h3>
                                            {device.isCurrent && (
                                                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                                                    Current Device
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-sm mt-1">
                                            Last active: {formatDate(device.lastActive)}
                                        </p>
                                    </div>
                                </div>

                                {!device.isCurrent && (
                                    <div>
                                        {showConfirm === device.id ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRevoke(device.id)}
                                                    disabled={revoking === device.id}
                                                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                                >
                                                    {revoking === device.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Confirm"
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setShowConfirm(null)}
                                                    className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowConfirm(device.id)}
                                                className="text-red-400 hover:text-red-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-blue-400 font-semibold mb-1">Security Tip</p>
                        <p className="text-blue-300/90 leading-relaxed">
                            Regularly review your active devices and revoke access from any
                            devices you no longer use or recognize.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
