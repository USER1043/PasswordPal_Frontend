// ============================================================================
// src/components/RecoveryKeyModal.tsx - Recovery Key Download Modal
// ============================================================================
import { useState } from "react";
import { Shield, Download, AlertTriangle, X, Check } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface RecoveryKeyModalProps {
    recoveryKey: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function RecoveryKeyModal({
    recoveryKey,
    onClose,
    onConfirm,
}: RecoveryKeyModalProps) {
    const [confirmed, setConfirmed] = useState(false);

    const { success } = useNotification();

    const handleDownload = () => {
        // Create a simple text file with the recovery key
        const blob = new Blob(
            [
                `PasswordPal Recovery Key\n\n`,
                `IMPORTANT: Store this key in a safe place!\n\n`,
                `Recovery Key: ${recoveryKey}\n\n`,
                `Use this key to restore access if you forget your master password.\n`,
                `Generated: ${new Date().toLocaleString()}\n`,
            ],
            { type: "text/plain" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `passwordpal-recovery-key-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        success("Recovery Key downloaded successfully!");
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-purple-400" />
                        <h2 className="text-2xl font-bold text-white">
                            Save Your Recovery Key
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-yellow-400 font-semibold mb-2">
                                Critical: Save This Key Now!
                            </p>
                            <p className="text-yellow-300/90 text-sm leading-relaxed">
                                This is your only chance to save your recovery key. If you lose
                                your master password and don't have this key, you will
                                permanently lose access to your vault.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recovery Key Display */}
                <div className="bg-slate-900/50 border border-slate-600 rounded-xl p-6 mb-6">
                    <p className="text-slate-400 text-sm mb-3">Your Recovery Key:</p>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm text-purple-300 break-all">
                        {recoveryKey}
                    </div>
                </div>

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mb-6"
                >
                    <Download className="w-5 h-5" />
                    Download Recovery Key
                </button>

                {/* Confirmation Checkbox */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                        I have saved my recovery key in a secure location and understand
                        that I cannot recover my account without it.
                    </span>
                </label>

                {/* Continue Button */}
                <button
                    onClick={onConfirm}
                    disabled={!confirmed}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    I've Saved My Key - Continue
                </button>
            </div>
        </div>
    );
}
