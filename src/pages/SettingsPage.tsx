// ============================================================================
// SettingsPage — Real 2FA, Password Change, Export, Delete Account
// ============================================================================
import { useState, useEffect } from "react";
import {
    Settings, Shield, Lock, User, Monitor,
    ChevronRight, Loader2, AlertTriangle,
    Download, Trash2, Key, QrCode, Copy,
    Check, X, Eye, EyeOff,
} from "lucide-react";
import DeviceManagement from "../components/DeviceManagement";
import { authService } from "../services/authService";
import * as totpService from "../services/totpService";
import { useNotification } from "../context/NotificationContext";
import apiClient from "../api/axiosClient";

interface SettingsPageProps {
    onNavigate: (view: string) => void;
    userEmail?: string;
}

export default function SettingsPage({ onNavigate, userEmail = "" }: SettingsPageProps) {
    const [activeTab, setActiveTab] = useState("security");
    const { success, error: notifyError } = useNotification();

    const tabs = [
        { id: "security", label: "Security", icon: Shield },
        { id: "devices", label: "Devices", icon: Monitor },
        { id: "account", label: "Account", icon: User },
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Settings className="w-8 h-8 text-purple-400" />
                    Settings
                </h1>
                <p className="text-slate-400 mt-2">Manage your security and account preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "text-slate-400 hover:text-white hover:bg-slate-700/30"
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "security" && <SecurityTab notifyError={notifyError} success={success} userEmail={userEmail} />}
            {activeTab === "devices" && <DeviceManagement />}
            {activeTab === "account" && <AccountTab onNavigate={onNavigate} notifyError={notifyError} success={success} />}
        </div>
    );
}

// ============================================================================
// Security Tab — 2FA and Password Change
// ============================================================================
function SecurityTab({ notifyError, success, userEmail }: { notifyError: (msg: string) => void; success: (msg: string) => void; userEmail: string }) {
    // 2FA State
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaLoading, setMfaLoading] = useState(true);
    const [setupMode, setSetupMode] = useState(false);
    const [qrData, setQrData] = useState<totpService.TotpSetupResponse | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [disableCode, setDisableCode] = useState("");
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Password Change State
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showOldPwd, setShowOldPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [changePwdLoading, setChangePwdLoading] = useState(false);

    useEffect(() => {
        loadMfaStatus();
    }, []);

    const loadMfaStatus = async () => {
        setMfaLoading(true);
        try {
            const status = await totpService.getStatus();
            setMfaEnabled(status.enabled);
        } catch {
            // MFA status check failed — assume disabled
        } finally {
            setMfaLoading(false);
        }
    };

    const handleSetupTotp = async () => {
        setActionLoading(true);
        try {
            const data = await totpService.setupTotp();
            setQrData(data);
            setSetupMode(true);
        } catch {
            notifyError("Failed to start 2FA setup");
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerifySetup = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            notifyError("Please enter a 6-digit code");
            return;
        }
        setActionLoading(true);
        try {
            const result = await totpService.verifySetup(verifyCode, qrData?.secret || "");
            setBackupCodes(result.backupCodes || []);
            setMfaEnabled(true);
            setSetupMode(false);
            setQrData(null);
            setVerifyCode("");
            success("Two-factor authentication enabled!");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Verification failed. Please try again.";
            notifyError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisableTotp = async () => {
        if (!disableCode) {
            notifyError("Please enter your TOTP code");
            return;
        }
        setActionLoading(true);
        try {
            await totpService.disableTotp(disableCode);
            setMfaEnabled(false);
            setShowDisableConfirm(false);
            setDisableCode("");
            success("Two-factor authentication disabled");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to disable 2FA";
            notifyError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleGenerateBackupCodes = async () => {
        setActionLoading(true);
        try {
            const result = await totpService.generateBackupCodes();
            setBackupCodes(result.backupCodes || []);
            success("New backup codes generated");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to generate backup codes";
            notifyError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            notifyError("Please fill in all fields");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            notifyError("New passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            notifyError("New password must be at least 8 characters");
            return;
        }
        setChangePwdLoading(true);
        try {
            await authService.changePassword(userEmail, oldPassword, newPassword);
            success("Password changed successfully");
            setShowPasswordChange(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch {
            notifyError("Password change failed. Check your current password.");
        } finally {
            setChangePwdLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-purple-400" />
                        <div>
                            <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                            <p className="text-slate-400 text-sm">Add an extra layer of security to your account</p>
                        </div>
                    </div>
                    {mfaLoading ? (
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${mfaEnabled ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"
                            }`}>
                            {mfaEnabled ? "Enabled" : "Disabled"}
                        </span>
                    )}
                </div>

                {/* Setup Mode */}
                {setupMode && qrData && (
                    <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <div className="text-center mb-4">
                            <QrCode className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <p className="text-white font-medium">Scan this QR code with your authenticator app</p>
                        </div>
                        {qrData.qrCode && (
                            <div className="flex justify-center mb-4">
                                <img src={qrData.qrCode} alt="QR Code" className="w-48 h-48 bg-white p-2 rounded-xl" />
                            </div>
                        )}
                        {qrData.secret && (
                            <div className="mb-4 p-3 bg-slate-800 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1">Manual entry key:</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-purple-300 font-mono text-sm flex-1">{qrData.secret}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(qrData.secret || "");
                                            success("Secret copied");
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={handleVerifySetup}
                                disabled={actionLoading || verifyCode.length !== 6}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Verify
                            </button>
                            <button
                                onClick={() => { setSetupMode(false); setQrData(null); setVerifyCode(""); }}
                                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Backup Codes Display */}
                {backupCodes.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            <p className="text-yellow-400 font-semibold">Save your backup codes!</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {backupCodes.map((code, i) => (
                                <code key={i} className="bg-slate-800 text-purple-300 px-3 py-2 rounded-lg text-center font-mono">
                                    {code}
                                </code>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(backupCodes.join("\n"));
                                success("Backup codes copied");
                            }}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
                        >
                            <Copy className="w-4 h-4" /> Copy all codes
                        </button>
                    </div>
                )}

                {/* Disable Confirmation */}
                {showDisableConfirm && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <p className="text-red-400 font-medium mb-3">Enter your TOTP code to disable 2FA:</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                className="flex-1 bg-slate-900 border border-red-500/30 rounded-lg px-4 py-3 text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button onClick={handleDisableTotp} disabled={actionLoading} className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable"}
                            </button>
                            <button onClick={() => { setShowDisableConfirm(false); setDisableCode(""); }} className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {!setupMode && !showDisableConfirm && !mfaLoading && (
                    <div className="flex gap-3 mt-4">
                        {!mfaEnabled ? (
                            <button onClick={handleSetupTotp} disabled={actionLoading} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Enable 2FA
                            </button>
                        ) : (
                            <>
                                <button onClick={handleGenerateBackupCodes} disabled={actionLoading} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50">
                                    <Key className="w-4 h-4" /> Regenerate Backup Codes
                                </button>
                                <button onClick={() => setShowDisableConfirm(true)} className="px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                                    <X className="w-4 h-4" /> Disable 2FA
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Change Password */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lock className="w-6 h-6 text-purple-400" />
                        <div>
                            <h3 className="text-lg font-semibold text-white">Change Master Password</h3>
                            <p className="text-slate-400 text-sm">Update your master password securely</p>
                        </div>
                    </div>
                    {!showPasswordChange && (
                        <button onClick={() => setShowPasswordChange(true)} className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm font-medium">
                            Change <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {showPasswordChange && (
                    <div className="mt-4 space-y-4">
                        <div className="relative">
                            <input type={showOldPwd ? "text" : "password"} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Current password"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <button onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="relative">
                            <input type={showNewPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <button onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password"
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <div className="flex gap-3">
                            <button onClick={handleChangePassword} disabled={changePwdLoading} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2">
                                {changePwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Update Password
                            </button>
                            <button onClick={() => { setShowPasswordChange(false); setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); }}
                                className="px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Account Tab — Export, Delete Account
// ============================================================================
function AccountTab({ onNavigate, notifyError, success }: { onNavigate: (view: string) => void; notifyError: (msg: string) => void; success: (msg: string) => void }) {
    const [exportLoading, setExportLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [showReauthModal, setShowReauthModal] = useState(false);
    const [reauthPassword, setReauthPassword] = useState("");
    const [reauthLoading, setReauthLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState<"export" | "delete" | null>(null);

    // Re-authenticate for sensitive actions
    const handleReauth = async () => {
        if (!reauthPassword) {
            notifyError("Please enter your password");
            return;
        }
        setReauthLoading(true);
        try {
            await apiClient.post("/auth/verify-password", { password: reauthPassword });
            setShowReauthModal(false);
            setReauthPassword("");
            // Retry the pending action
            if (pendingAction === "export") {
                await doExport();
            } else if (pendingAction === "delete") {
                await doDelete();
            }
            setPendingAction(null);
        } catch {
            notifyError("Incorrect password");
        } finally {
            setReauthLoading(false);
        }
    };

    const doExport = async () => {
        setExportLoading(true);
        try {
            const { fetchVault } = await import("../services/vaultService");
            const items = await fetchVault();
            if (items.length === 0) {
                notifyError("Your vault is empty. Nothing to export.");
                setExportLoading(false);
                return;
            }

            // Generate CSV matching import format: Name, Username, Password, URL, Folder, Notes
            const headers = ["Name", "Username", "Password", "URL", "Folder", "Notes"];
            const escapeCSV = (val: string | undefined | null) => {
                if (!val) return '""';
                const s = String(val);
                return s.includes(',') || s.includes('"') || s.includes('\n')
                    ? `"${s.replace(/"/g, '""')}"`
                    : `"${s}"`; // Quote everything to be safe
            };

            const csvRows = items.map(item => [
                escapeCSV(item.name),
                escapeCSV(item.username),
                escapeCSV(item.password),
                escapeCSV(item.website_url),
                escapeCSV(item.folder_name),
                escapeCSV(item.notes)
            ].join(','));

            const csvContent = [headers.join(','), ...csvRows].join('\n');
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `passwordpal-export-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            success(`Exported ${items.length} passwords to CSV`);
        } catch (err: unknown) {
            console.error("Export failed:", err);
            if ((err as { response?: { status?: number } }).response?.status === 403) {
                setPendingAction("export");
                setShowReauthModal(true);
            } else {
                notifyError("Export failed");
            }
        } finally {
            setExportLoading(false);
        }
    };

    const handleExport = () => doExport();

    const doDelete = async () => {
        setDeleteLoading(true);
        try {
            await apiClient.delete("/api/delete-account");
            await authService.logout();
            onNavigate("login");
        } catch (err: unknown) {
            if ((err as { response?: { status?: number } }).response?.status === 403) {
                setPendingAction("delete");
                setShowReauthModal(true);
            } else {
                notifyError("Account deletion failed");
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            notifyError("Please type DELETE to confirm");
            return;
        }
        await doDelete();
    };

    return (
        <div className="space-y-6">
            {/* Export */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Download className="w-6 h-6 text-blue-400" />
                        <div>
                            <h3 className="text-lg font-semibold text-white">Export Vault</h3>
                            <p className="text-slate-400 text-sm">Download an encrypted backup of your vault data</p>
                        </div>
                    </div>
                    <button onClick={handleExport} disabled={exportLoading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
                        {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export
                    </button>
                </div>
            </div>

            {/* Import */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Download className="w-6 h-6 text-green-400 rotate-180" />
                        <div>
                            <h3 className="text-lg font-semibold text-white">Import Passwords</h3>
                            <p className="text-slate-400 text-sm">Import from a CSV file exported from another password manager</p>
                        </div>
                    </div>
                    <label className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2">
                        <Download className="w-4 h-4 rotate-180" />
                        Import CSV
                        <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                                const text = await file.text();
                                const lines = text.split("\n").filter((l) => l.trim());
                                if (lines.length < 2) { notifyError("CSV file is empty"); return; }
                                // Parse headers
                                const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
                                const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("title"));
                                const userIdx = headers.findIndex((h) => h.includes("user") || h.includes("email") || h.includes("login"));
                                const passIdx = headers.findIndex((h) => h.includes("pass"));
                                const urlIdx = headers.findIndex((h) => h.includes("url") || h.includes("site"));

                                if (passIdx === -1) { notifyError("CSV must have a password column"); return; }

                                const { saveEntry } = await import("../services/vaultService");
                                let imported = 0;
                                for (let i = 1; i < lines.length; i++) {
                                    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
                                    if (!cols[passIdx]) continue;
                                    await saveEntry({
                                        name: cols[nameIdx] || `Import ${i}`,
                                        username: cols[userIdx] || "",
                                        password: cols[passIdx],
                                        website_url: cols[urlIdx] || "",
                                        folder_name: "Imported",
                                        tags: [],
                                        notes: "",
                                    });
                                    imported++;
                                }
                                success(`Imported ${imported} passwords`);
                            } catch { notifyError("Import failed"); }
                        }} />
                    </label>
                </div>
            </div>

            {/* Delete Account */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Trash2 className="w-6 h-6 text-red-400" />
                    <div>
                        <h3 className="text-lg font-semibold text-red-400">Delete Account</h3>
                        <p className="text-slate-400 text-sm">Permanently delete your account and all vault data</p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} className="mt-4 px-6 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl font-semibold transition-all">
                        Delete My Account
                    </button>
                ) : (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 font-semibold">This action cannot be undone</p>
                                <p className="text-slate-400 text-sm mt-1">Type DELETE to confirm account deletion</p>
                            </div>
                        </div>
                        <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE"
                            className="w-full bg-slate-900 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-3 font-mono" />
                        <div className="flex gap-3">
                            <button onClick={handleDeleteAccount} disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2">
                                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete Forever
                            </button>
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                                className="px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Re-auth Modal */}
            {showReauthModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-white mb-2">Re-authentication Required</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            For security, please enter your master password to continue.
                        </p>
                        <input
                            type="password"
                            value={reauthPassword}
                            onChange={(e) => setReauthPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleReauth()}
                            placeholder="Enter master password"
                            autoFocus
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowReauthModal(false); setReauthPassword(""); setPendingAction(null); }}
                                className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReauth}
                                disabled={reauthLoading}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
                            >
                                {reauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
