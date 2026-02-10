// Settings page - manage account, security, devices, and preferences
import {
    Shield,
    User,
    Smartphone,
    Download,
    Upload,
    Bell,
    AlertTriangle,
    ChevronRight,
    LogOut,
} from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import DeviceManagement from "../components/DeviceManagement";

interface SettingsPageProps {
    onNavigate: (view: string) => void;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
    const [activeTab, setActiveTab] = useState("account");

    const tabs = [
        { id: "account", label: "Account", icon: User },
        { id: "security", label: "Security", icon: Shield },
        { id: "devices", label: "Devices", icon: Smartphone },
        { id: "preferences", label: "Preferences", icon: Bell },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Top Navigation Bar */}
            <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onNavigate("vault")}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                                ← Back
                            </button>
                            <Shield className="w-8 h-8 text-purple-400" />
                            <h1 className="text-2xl font-bold text-white">Settings</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-12 gap-6">
                    {/* Sidebar Tabs */}
                    <div className="col-span-3">
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sticky top-6">
                            <div className="space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                            : "text-slate-300 hover:bg-slate-700/50"
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        <span className="font-medium">{tab.label}</span>
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                    </button>
                                ))}
                            </div>

                            {/* Danger Zone */}
                            <div className="mt-6 pt-6 border-t border-slate-700/50">
                                <button
                                    onClick={async () => {
                                        try {
                                            await invoke("lock_vault");
                                            console.log("Vault locked successfully");
                                        } catch (error) {
                                            console.error("Failed to lock vault:", error);
                                        } finally {
                                            onNavigate("login");
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-9">
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
                            {/* Account Tab */}
                            {activeTab === "account" && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            Account Settings
                                        </h2>
                                        <p className="text-slate-400">
                                            Manage your account information and preferences
                                        </p>
                                    </div>

                                    {/* Email */}
                                    <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-white font-semibold mb-1">
                                                    Email Address
                                                </h3>
                                                <p className="text-slate-400 text-sm">
                                                    user@example.com
                                                </p>
                                            </div>
                                            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                                                Change
                                            </button>
                                        </div>
                                    </div>

                                    {/* Master Password */}
                                    <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-white font-semibold mb-1">
                                                    Master Password
                                                </h3>
                                                <p className="text-slate-400 text-sm">
                                                    Last changed 3 months ago
                                                </p>
                                            </div>
                                            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                                                Change Password
                                            </button>
                                        </div>
                                    </div>

                                    {/* Recovery Key */}
                                    <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                        <div className="flex items-start gap-4">
                                            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-1">
                                                    Recovery Key
                                                </h3>
                                                <p className="text-slate-300 text-sm mb-3">
                                                    Download your recovery key to restore access if you
                                                    forget your master password
                                                </p>
                                                <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
                                                    <Download className="w-4 h-4" />
                                                    Download Recovery Key
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Export/Import */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                            <Upload className="w-8 h-8 text-purple-400 mb-3" />
                                            <h3 className="text-white font-semibold mb-1">
                                                Import Passwords
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-4">
                                                Import from CSV file
                                            </p>
                                            <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                                                Choose File
                                            </button>
                                        </div>

                                        <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                            <Download className="w-8 h-8 text-purple-400 mb-3" />
                                            <h3 className="text-white font-semibold mb-1">
                                                Export Passwords
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-4">
                                                Export to CSV file
                                            </p>
                                            <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                                                Export
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === "security" && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            Security Settings
                                        </h2>
                                        <p className="text-slate-400">
                                            Configure security features and authentication
                                        </p>
                                    </div>

                                    {/* Two-Factor Authentication */}
                                    <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-white font-semibold mb-1">
                                                    Two-Factor Authentication
                                                </h3>
                                                <p className="text-slate-400 text-sm">
                                                    Add an extra layer of security
                                                </p>
                                            </div>
                                            <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                                                Disabled
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                                            Enable 2FA
                                        </button>
                                    </div>

                                    {/* Security Settings Info */}
                                    <div className="p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                                        <div className="flex items-start gap-4">
                                            <Shield className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="text-white font-semibold mb-2">
                                                    Automatic Security Settings
                                                </h3>
                                                <div className="space-y-2 text-sm text-slate-300">
                                                    <p>
                                                        <span className="font-medium text-purple-300">Auto-Lock:</span> Your vault automatically locks after 15 minutes of inactivity or when the application loses focus.
                                                    </p>
                                                    <p>
                                                        <span className="font-medium text-purple-300">Clipboard Security:</span> Copied passwords are automatically cleared from your clipboard after 30 seconds.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Devices Tab */}
                            {activeTab === "devices" && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            Connected Devices
                                        </h2>
                                        <p className="text-slate-400">
                                            Manage devices that have access to your vault
                                        </p>
                                    </div>

                                    <DeviceManagement />
                                </div>
                            )}

                            {/* Preferences Tab */}
                            {activeTab === "preferences" && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            Preferences
                                        </h2>
                                        <p className="text-slate-400">
                                            Customize your experience
                                        </p>
                                    </div>

                                    {/* Notifications */}
                                    <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-white font-semibold mb-1">
                                                    Security Alerts
                                                </h3>
                                                <p className="text-slate-400 text-sm">
                                                    Get notified about security issues
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-white font-semibold mb-1">
                                                    Breach Monitoring
                                                </h3>
                                                <p className="text-slate-400 text-sm">
                                                    Check if your passwords appear in known data breaches
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
