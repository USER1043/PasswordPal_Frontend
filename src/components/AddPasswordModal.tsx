import { useState, useEffect } from "react";
import { X, Save, RefreshCw, Eye, EyeOff, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import * as breachService from "../services/breachService";

interface AddPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: PasswordData) => void;
    editData?: PasswordData | null;
}

export interface PasswordData {
    id?: string;
    name: string;
    username: string;
    password: string;
    url?: string;
    folder?: string;
    notes?: string;
    version?: number;
    updated_at?: string;
}

export default function AddPasswordModal({
    isOpen,
    onClose,
    onSave,
    editData,
}: AddPasswordModalProps) {
    const [formData, setFormData] = useState<PasswordData>(
        editData || {
            name: "",
            username: "",
            password: "",
            url: "",
            folder: "",
            notes: "",
        }
    );
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [customFolders, setCustomFolders] = useState<string[]>([]);
    const [breachWarning, setBreachWarning] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Sync incoming editData into local state when the modal opens.
    // This is required because the modal stays mounted in VaultPage, 
    // so useState(editData) only runs once on initial mount.
    useEffect(() => {
        if (isOpen) {
            if (editData) {
                setFormData(editData);
                calculateStrength(editData.password || "");
            } else {
                setFormData({
                    name: "",
                    username: "",
                    password: "",
                    url: "",
                    folder: "",
                    notes: "",
                });
                setPasswordStrength(0);
            }
            setBreachWarning(null);
            setShowNewFolderInput(false);
            setNewFolderName("");
        }
    }, [isOpen, editData]);

    if (!isOpen) return null;

    const generatePassword = () => {
        const length = 16;
        const charset =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }
        setFormData({ ...formData, password });
        calculateStrength(password);
    };

    const calculateStrength = (pwd: string) => {
        let strength = 0;
        if (pwd.length >= 8) strength += 20;
        if (pwd.length >= 12) strength += 15;
        if (pwd.length >= 16) strength += 15;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 20;
        if (/[0-9]/.test(pwd)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(pwd)) strength += 15;
        setPasswordStrength(Math.min(strength, 100));
    };

    const handlePasswordChange = (pwd: string) => {
        setFormData({ ...formData, password: pwd });
        calculateStrength(pwd);
    };

    const handleCreateFolder = () => {
        if (newFolderName.trim() && !customFolders.includes(newFolderName.trim())) {
            const folderName = newFolderName.trim();
            setCustomFolders([...customFolders, folderName]);
            setFormData({ ...formData, folder: folderName });
            setNewFolderName("");
            setShowNewFolderInput(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.username || !formData.password) {
            alert("Please fill in required fields");
            return;
        }

        setSaving(true);
        setBreachWarning(null);

        // Check password against HIBP before saving
        try {
            const result = await breachService.checkPasswordBreach(formData.password);
            if (result.breached) {
                setBreachWarning(`This password has been found in ${result.count.toLocaleString()} data breaches. Consider using a different password.`);
                setSaving(false);
                return; // Don't save breached password on first attempt
            }
        } catch {
            // If breach check fails, proceed with save anyway
        }

        onSave(formData);
        setSaving(false);
        onClose();
    };

    // Force save even if breached (user clicked Save again after seeing warning)
    const handleForceSave = () => {
        onSave(formData);
        onClose();
    };

    const getStrengthColor = () => {
        if (passwordStrength < 40) return "bg-red-500";
        if (passwordStrength < 70) return "bg-yellow-500";
        return "bg-green-500";
    };

    const getStrengthLabel = () => {
        if (passwordStrength < 40) return "Weak";
        if (passwordStrength <= 70) return "Medium";
        return "Strong";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">
                        {editData ? "Edit Password" : "Add New Password"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="e.g., GitHub, Gmail, Netflix"
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Username/Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Username or Email <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) =>
                                setFormData({ ...formData, username: e.target.value })
                            }
                            placeholder="user@example.com"
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => handlePasswordChange(e.target.value)}
                                placeholder="Enter password"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 pr-24 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title={showPassword ? "Hide" : "Show"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    onClick={generatePassword}
                                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                                    title="Generate password"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Password Strength */}
                        {formData.password && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-400">Password Strength</span>
                                    <span
                                        className={`font-semibold ${passwordStrength < 40
                                            ? "text-red-400"
                                            : passwordStrength < 70
                                                ? "text-yellow-400"
                                                : "text-green-400"
                                            }`}
                                    >
                                        {getStrengthLabel()}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getStrengthColor()} transition-all duration-300`}
                                        style={{ width: `${passwordStrength}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Breach Warning */}
                    {breachWarning && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 text-sm font-semibold mb-1">Breached Password Detected</p>
                                <p className="text-red-300/80 text-sm">{breachWarning}</p>
                            </div>
                        </div>
                    )}

                    {/* URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Website URL
                        </label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://example.com"
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Folder */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Folder
                        </label>
                        {!showNewFolderInput ? (
                            <div className="space-y-2 relative">
                                <select
                                    value={formData.folder}
                                    onChange={(e) => {
                                        if (e.target.value === "__create_new__") {
                                            setShowNewFolderInput(true);
                                        } else {
                                            setFormData({ ...formData, folder: e.target.value });
                                        }
                                    }}
                                    className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                >
                                    <option value="" className="bg-slate-800 text-slate-300">No Folder</option>
                                    <option value="Personal" className="bg-slate-800 text-white">📁 Personal</option>
                                    <option value="Work" className="bg-slate-800 text-white">💼 Work</option>
                                    <option value="Finance" className="bg-slate-800 text-white">💰 Finance</option>
                                    <option value="Social" className="bg-slate-800 text-white">🌐 Social</option>
                                    {customFolders.map((folder) => (
                                        <option key={folder} value={folder} className="bg-slate-800 text-white">
                                            📂 {folder}
                                        </option>
                                    ))}
                                    <option value="__create_new__" className="bg-purple-900/30 text-purple-300 font-semibold">
                                        ➕ Create New Folder
                                    </option>
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                                        placeholder="Enter folder name"
                                        className="flex-1 bg-slate-900/50 border border-purple-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleCreateFolder}
                                        className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-semibold"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewFolderInput(false);
                                            setNewFolderName("");
                                        }}
                                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400">Press Enter or click Create to add the folder</p>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder="Additional notes (optional)"
                            rows={3}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl font-medium transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={breachWarning ? handleForceSave : handleSubmit}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-purple-500/50 disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {breachWarning ? "Save Anyway" : (editData ? "Update" : "Save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
