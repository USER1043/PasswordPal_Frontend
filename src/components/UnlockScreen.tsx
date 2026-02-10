// ============================================================================
// src/components/UnlockScreen.tsx - Vault Unlock Overlay
// ============================================================================
import { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

interface UnlockScreenProps {
    onUnlock: (password: string) => Promise<void>;
    onCancel?: () => void;
}

export default function UnlockScreen({ onUnlock, onCancel }: UnlockScreenProps) {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleUnlock = async () => {
        if (!password) {
            setError("Please enter your master password");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await onUnlock(password);
        } catch (err) {
            setError("Invalid password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md">
                <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                    {/* Lock Icon */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="relative">
                            <div className="bg-purple-500/20 rounded-full p-6">
                                <Lock className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
                            </div>
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20"></div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                        Vault Locked
                    </h2>
                    <p className="text-slate-400 text-center mb-8">
                        Enter your master password to unlock
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <span className="text-red-400 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Password Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Master Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                                placeholder="Enter your master password"
                                autoFocus
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Unlock Button */}
                    <button
                        onClick={handleUnlock}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-600/50 disabled:to-purple-700/50 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50 transform hover:scale-[1.02] disabled:transform-none mb-4"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Unlocking...</span>
                            </>
                        ) : (
                            <>
                                <Lock className="w-5 h-5" />
                                <span>Unlock Vault</span>
                            </>
                        )}
                    </button>

                    {/* Cancel Button (optional) */}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="w-full text-slate-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Biometric Placeholder */}
                <div className="mt-6 text-center">
                    <p className="text-slate-500 text-sm">
                        Biometric unlock coming soon
                    </p>
                </div>
            </div>
        </div>
    );
}
