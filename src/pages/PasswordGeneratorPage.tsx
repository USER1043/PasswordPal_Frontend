import {
    RefreshCw,
    Copy,
    Check,
    Sliders,
    Zap,
    Lock,
    Eye,
    EyeOff,
} from "lucide-react";
import { useState, useEffect } from "react";

interface PasswordGeneratorPageProps {
    onNavigate: (view: string) => void;
}

export default function PasswordGeneratorPage({
    onNavigate,
}: PasswordGeneratorPageProps) {
    const [password, setPassword] = useState("");
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [excludeSimilar, setExcludeSimilar] = useState(false);
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(true);
    const [strength, setStrength] = useState(0);

    const generatePassword = () => {
        let charset = "";
        let newPassword = "";

        // Build character set
        if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
        if (includeNumbers) charset += "0123456789";
        if (includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

        // Remove similar characters if requested
        if (excludeSimilar) {
            charset = charset.replace(/[il1Lo0O]/g, "");
        }

        // Remove ambiguous characters if requested
        if (excludeAmbiguous) {
            charset = charset.replace(/[{}[\]()/\\'"~,;:.<>]/g, "");
        }

        if (charset.length === 0) {
            setPassword("Please select at least one character type");
            return;
        }

        // Generate password using crypto.getRandomValues for security
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            newPassword += charset[array[i] % charset.length];
        }

        setPassword(newPassword);
        calculateStrength(newPassword);
    };

    const calculateStrength = (pwd: string) => {
        let score = 0;

        // Length score
        if (pwd.length >= 8) score += 20;
        if (pwd.length >= 12) score += 20;
        if (pwd.length >= 16) score += 20;

        // Character variety
        if (/[a-z]/.test(pwd)) score += 10;
        if (/[A-Z]/.test(pwd)) score += 10;
        if (/[0-9]/.test(pwd)) score += 10;
        if (/[^a-zA-Z0-9]/.test(pwd)) score += 10;

        setStrength(Math.min(score, 100));
    };

    const handleCopy = async () => {
        if (password && password !== "Please select at least one character type") {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getStrengthLabel = () => {
        if (strength < 40) return { label: "Weak", color: "text-red-400" };
        if (strength < 70) return { label: "Fair", color: "text-yellow-400" };
        if (strength < 90) return { label: "Good", color: "text-green-400" };
        return { label: "Excellent", color: "text-emerald-400" };
    };

    const getStrengthColor = () => {
        if (strength < 40) return "from-red-500 to-red-600";
        if (strength < 70) return "from-yellow-500 to-orange-500";
        if (strength < 90) return "from-green-500 to-green-600";
        return "from-emerald-500 to-green-500";
    };

    // Generate initial password
    useEffect(() => {
        generatePassword();
    }, []);

    // Regenerate when options change
    useEffect(() => {
        if (password) generatePassword();
    }, [
        length,
        includeUppercase,
        includeLowercase,
        includeNumbers,
        includeSymbols,
        excludeSimilar,
        excludeAmbiguous,
    ]);

    const strengthInfo = getStrengthLabel();

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
                            <Zap className="w-8 h-8 text-purple-400" />
                            <h1 className="text-2xl font-bold text-white">
                                Password Generator
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 max-w-4xl">
                {/* Main Generator Card */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 mb-6">
                    {/* Generated Password Display */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Generated Password
                        </label>
                        <div className="relative">
                            <div className="bg-slate-900/50 border-2 border-purple-500/30 rounded-xl p-5 pr-32">
                                <div className="font-mono text-2xl text-white break-all">
                                    {showPassword
                                        ? password
                                        : "•".repeat(password.length)}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title="Copy password"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Copy className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    onClick={generatePassword}
                                    className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                    title="Generate new password"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Strength Indicator */}
                    <div className="mb-8 p-5 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-300">
                                Password Strength
                            </span>
                            <span className={`text-sm font-bold ${strengthInfo.color}`}>
                                {strengthInfo.label}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${getStrengthColor()} rounded-full transition-all duration-500`}
                                style={{ width: `${strength}%` }}
                            />
                        </div>
                    </div>

                    {/* Length Slider */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-300">
                                Password Length
                            </label>
                            <span className="text-2xl font-bold text-purple-400">
                                {length}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="8"
                            max="64"
                            value={length}
                            onChange={(e) => setLength(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>8</span>
                            <span>16</span>
                            <span>32</span>
                            <span>64</span>
                        </div>
                    </div>

                    {/* Character Options */}
                    <div className="space-y-3 mb-6">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
                            <Sliders className="w-4 h-4" />
                            Character Types
                        </h3>

                        <label className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer">
                            <div>
                                <span className="text-white font-medium">
                                    Uppercase Letters
                                </span>
                                <p className="text-slate-400 text-sm">A-Z</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={includeUppercase}
                                onChange={(e) => setIncludeUppercase(e.target.checked)}
                                className="w-5 h-5 rounded accent-purple-600"
                            />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer">
                            <div>
                                <span className="text-white font-medium">
                                    Lowercase Letters
                                </span>
                                <p className="text-slate-400 text-sm">a-z</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={includeLowercase}
                                onChange={(e) => setIncludeLowercase(e.target.checked)}
                                className="w-5 h-5 rounded accent-purple-600"
                            />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer">
                            <div>
                                <span className="text-white font-medium">Numbers</span>
                                <p className="text-slate-400 text-sm">0-9</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={includeNumbers}
                                onChange={(e) => setIncludeNumbers(e.target.checked)}
                                className="w-5 h-5 rounded accent-purple-600"
                            />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer">
                            <div>
                                <span className="text-white font-medium">Symbols</span>
                                <p className="text-slate-400 text-sm">!@#$%^&*</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={includeSymbols}
                                onChange={(e) => setIncludeSymbols(e.target.checked)}
                                className="w-5 h-5 rounded accent-purple-600"
                            />
                        </label>
                    </div>

                    {/* Advanced Options */}
                    <div className="space-y-3 pt-6 border-t border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4">
                            Advanced Options
                        </h3>

                        <label className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer">
                            <div>
                                <span className="text-white font-medium">
                                    Exclude Similar Characters
                                </span>
                                <p className="text-slate-400 text-sm">i, l, 1, L, o, 0, O</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={excludeSimilar}
                                onChange={(e) => setExcludeSimilar(e.target.checked)}
                                className="w-5 h-5 rounded accent-purple-600"
                            />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer">
                            <div>
                                <span className="text-white font-medium">
                                    Exclude Ambiguous Symbols
                                </span>
                                <p className="text-slate-400 text-sm">{`{ } [ ] ( ) / \\ ' " ~`}</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={excludeAmbiguous}
                                onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                                className="w-5 h-5 rounded accent-purple-600"
                            />
                        </label>
                    </div>
                </div>

                {/* Security Info */}
                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <Lock className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-slate-200 font-semibold mb-1">
                                Cryptographically Secure
                            </p>
                            <p className="text-slate-400 leading-relaxed">
                                Passwords are generated using crypto.getRandomValues() for
                                maximum security. They are never sent to any server.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
