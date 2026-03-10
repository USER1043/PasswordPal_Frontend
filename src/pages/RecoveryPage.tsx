// ============================================================================
// RecoveryPage — Account Recovery via Recovery Key (Zero-Knowledge)
// ============================================================================
import { useState } from "react";
import { Shield, Key, Eye, EyeOff, Loader2, AlertTriangle, Copy, CheckCircle } from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import apiClient from "../api/axiosClient";
import { invoke } from "@tauri-apps/api/core";

interface RecoveryPageProps {
    onNavigate: (view: string) => void;
}

export default function RecoveryPage({ onNavigate }: RecoveryPageProps) {
    const [email, setEmail] = useState("");
    const [recoveryKey, setRecoveryKey] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recoveredKey, setRecoveredKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { success, error: notifyError } = useNotification();

    const handleCopy = async () => {
        if (!recoveredKey) return;
        await navigator.clipboard.writeText(recoveredKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRecover = async () => {
        if (!email || !recoveryKey || !newPassword) {
            notifyError("Please fill in all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            notifyError("Passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            notifyError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            // Re-wrap the existing MEK from the recovery key under the new password.
            // This preserves the vault — no new MEK is generated.
            const recoverData = await invoke<{
                new_salt: string;
                new_wrapped_mek: string;
                new_auth_hash: string;
            }>("recover_vault", {
                recoveryKey: recoveryKey.trim(),
                newPassword,
            });

            // Send new credentials to backend. Backend verifies the recovery key hash
            // server-side before updating.
            await apiClient.post("/auth/recover", {
                email,
                recovery_key: recoveryKey.trim(),
                new_salt: recoverData.new_salt,
                new_wrapped_mek: recoverData.new_wrapped_mek,
                new_auth_hash: recoverData.new_auth_hash,
            });

            success("Account recovered!");
            setRecoveredKey(recoveryKey.trim());
        } catch (err: unknown) {
            console.error("Recovery error:", err);
            const status = (err as { response?: { status?: number } }).response?.status;
            if (status === 404) {
                notifyError("Account not found or no recovery key on file");
            } else if (status === 401) {
                notifyError("Invalid recovery key — please check and try again");
            } else {
                const detail = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
                notifyError(detail || "Recovery failed. Please check your recovery key.");
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ───────────────────────────────────────────────────────
    if (recoveredKey) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
                <div className="w-full max-w-md">
                    <div className="bg-slate-900/40 backdrop-blur-2xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Account Recovered!</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            Your master password has been reset. Your recovery key is <strong className="text-white">unchanged</strong> — make sure you still have it saved securely.
                        </p>

                        <div className="bg-slate-950/60 border border-yellow-500/30 rounded-xl p-4 mb-4 text-left">
                            <p className="text-xs text-yellow-400 font-medium mb-2 flex items-center gap-1">
                                <Key className="w-3.5 h-3.5" /> Your Recovery Key
                            </p>
                            <p className="font-mono text-xs text-white break-all leading-relaxed">{recoveredKey}</p>
                        </div>

                        <button
                            onClick={handleCopy}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-all mb-3"
                        >
                            <Copy className="w-4 h-4" />
                            {copied ? "Copied!" : "Copy Recovery Key"}
                        </button>

                        <button
                            onClick={() => onNavigate("login")}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20"
                        >
                            Continue to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                            <Shield className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30"></div>
                        </div>
                        <h1 className="text-2xl font-bold text-white ml-3">PasswordPal</h1>
                    </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-4">
                            <Key className="w-8 h-8 text-yellow-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Account Recovery</h2>
                        <p className="text-slate-400 text-sm">
                            Enter your recovery key to reset your master password
                        </p>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-yellow-300/90 text-xs leading-relaxed">
                                Your recovery key was shown when you created your account.
                                Without it, account recovery is impossible due to zero-knowledge encryption.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Recovery Key
                            </label>
                            <textarea
                                value={recoveryKey}
                                onChange={(e) => setRecoveryKey(e.target.value.trim())}
                                placeholder="Paste your recovery key here"
                                rows={3}
                                className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                New Master Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Choose a strong password"
                                    className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your new password"
                                onKeyDown={(e) => e.key === "Enter" && handleRecover()}
                                className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleRecover}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Recovering...
                            </>
                        ) : (
                            "Recover Account"
                        )}
                    </button>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => onNavigate("login")}
                            className="text-slate-400 hover:text-purple-300 text-sm transition-colors"
                        >
                            ← Back to login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
