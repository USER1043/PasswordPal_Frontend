// ============================================================================
// SecurityDashboardPage — Real vault analysis (strength, reuse, age, breach)
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import {
    Shield, AlertTriangle, CheckCircle, XCircle,
    Loader2, RefreshCw, Lock, Eye,
} from "lucide-react";
import * as vaultService from "../services/vaultService";
import * as breachService from "../services/breachService";
import type { DecryptedVaultItem } from "../services/vaultService";
import { useNotification } from "../context/NotificationContext";

interface SecurityDashboardProps {
    onNavigate: (view: string) => void;
}

interface PasswordAnalysis {
    id: string;
    name: string;
    username: string;
    strength: "weak" | "medium" | "strong";
    strengthScore: number;
    isReused: boolean;
    isOld: boolean;
    breached: boolean;
    breachCount: number;
    updatedAt: string;
}

function analyzePasswordStrength(password: string): { strength: "weak" | "medium" | "strong"; score: number } {
    let score = 0;
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    score = Math.min(score, 100);

    return {
        score,
        strength: score < 40 ? "weak" : score < 70 ? "medium" : "strong",
    };
}

export default function SecurityDashboardPage({ onNavigate }: SecurityDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [analyses, setAnalyses] = useState<PasswordAnalysis[]>([]);
    const [breachChecking, setBreachChecking] = useState(false);
    const [breachProgress, setBreachProgress] = useState(0);
    const { error: notifyError } = useNotification();

    const analyzeVault = useCallback((items: DecryptedVaultItem[]): PasswordAnalysis[] => {
        // Count password occurrences for reuse detection
        const passwordCounts = new Map<string, number>();
        items.forEach((item) => {
            const count = passwordCounts.get(item.password) || 0;
            passwordCounts.set(item.password, count + 1);
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        return items.map((item) => {
            const { strength, score } = analyzePasswordStrength(item.password);
            const isReused = (passwordCounts.get(item.password) || 0) > 1;
            const isOld = new Date(item.updated_at) < sixMonthsAgo;

            return {
                id: item.id,
                name: item.name,
                username: item.username,
                strength,
                strengthScore: score,
                isReused,
                isOld,
                breached: false,
                breachCount: 0,
                updatedAt: item.updated_at,
            };
        });
    }, []);

    const loadAndAnalyze = useCallback(async () => {
        setLoading(true);
        try {
            const items = await vaultService.fetchVault();
            const analyzed = analyzeVault(items);
            setAnalyses(analyzed);
        } catch (err) {
            console.error("Failed to load vault for analysis:", err);
            notifyError("Failed to load vault data for security analysis");
        } finally {
            setLoading(false);
        }
    }, [analyzeVault, notifyError]);

    useEffect(() => {
        loadAndAnalyze();
    }, [loadAndAnalyze]);

    const runBreachCheck = async () => {
        setBreachChecking(true);
        setBreachProgress(0);

        const items = await vaultService.fetchVault();
        const updated = [...analyses];

        for (let i = 0; i < items.length; i++) {
            try {
                const result = await breachService.checkPasswordBreach(items[i].password);
                const idx = updated.findIndex((a) => a.id === items[i].id);
                if (idx !== -1) {
                    updated[idx] = { ...updated[idx], breached: result.breached, breachCount: result.count };
                }
            } catch {
                // Skip individual failures
            }
            setBreachProgress(Math.round(((i + 1) / items.length) * 100));
            // Small delay to avoid rate limiting
            await new Promise((r) => setTimeout(r, 200));
        }

        setAnalyses(updated);
        setBreachChecking(false);
    };

    // Calculate stats
    const total = analyses.length;
    const weakCount = analyses.filter((a) => a.strength === "weak").length;
    const reusedCount = analyses.filter((a) => a.isReused).length;
    const oldCount = analyses.filter((a) => a.isOld).length;
    const breachedCount = analyses.filter((a) => a.breached).length;
    const issueCount = weakCount + reusedCount + oldCount + breachedCount;
    const securityScore = total > 0 ? Math.max(0, Math.round(((total * 4 - issueCount) / (total * 4)) * 100)) : 100;

    const getScoreColor = () => {
        if (securityScore >= 80) return "text-green-400";
        if (securityScore >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getScoreRingColor = () => {
        if (securityScore >= 80) return "stroke-green-500";
        if (securityScore >= 60) return "stroke-yellow-500";
        return "stroke-red-500";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                <span className="ml-4 text-slate-400 text-lg">Analyzing vault security...</span>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-purple-400" />
                        Security Dashboard
                    </h1>
                    <p className="text-slate-400 mt-2">Comprehensive analysis of your vault's security posture</p>
                </div>
                <button onClick={loadAndAnalyze} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors" title="Refresh analysis">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {total === 0 ? (
                <div className="text-center py-20">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-400 mb-2">No passwords to analyze</h3>
                    <p className="text-slate-500 mb-6">Add passwords to your vault to see security analysis</p>
                    <button onClick={() => onNavigate("vault")} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold">
                        Go to Vault
                    </button>
                </div>
            ) : (
                <>
                    {/* Score + Stats Row */}
                    <div className="grid grid-cols-5 gap-4 mb-8">
                        {/* Score Circle */}
                        <div className="col-span-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center">
                            <div className="relative w-28 h-28">
                                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700" />
                                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                                        className={getScoreRingColor()} strokeDasharray={`${securityScore * 2.64} 264`} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-2xl font-bold ${getScoreColor()}`}>{securityScore}</span>
                                    <span className="text-xs text-slate-500">Score</span>
                                </div>
                            </div>
                        </div>

                        {/* Stat Cards */}
                        {[
                            { label: "Weak", count: weakCount, icon: AlertTriangle, color: "red", desc: "Need stronger passwords" },
                            { label: "Reused", count: reusedCount, icon: Eye, color: "orange", desc: "Same password used" },
                            { label: "Old", count: oldCount, icon: RefreshCw, color: "yellow", desc: "Over 6 months old" },
                            { label: "Breached", count: breachedCount, icon: XCircle, color: "red", desc: "Found in data breaches" },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                                    <span className="text-slate-400 text-sm">{stat.label}</span>
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">{stat.count}</div>
                                <div className="text-xs text-slate-500">{stat.desc}</div>
                            </div>
                        ))}
                    </div>

                    {/* Breach Check Button */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Lock className="w-5 h-5 text-purple-400" />
                                <div>
                                    <p className="text-white font-medium">Dark Web Breach Check</p>
                                    <p className="text-slate-400 text-sm">Check your passwords against known data breaches (HIBP k-Anonymity)</p>
                                </div>
                            </div>
                            <button onClick={runBreachCheck} disabled={breachChecking}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 text-sm">
                                {breachChecking ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Checking {breachProgress}%</>
                                ) : (
                                    <><Shield className="w-4 h-4" /> Run Breach Check</>
                                )}
                            </button>
                        </div>
                        {breachChecking && (
                            <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${breachProgress}%` }} />
                            </div>
                        )}
                    </div>

                    {/* Password List */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700/50">
                            <h3 className="text-lg font-semibold text-white">Password Health ({total} items)</h3>
                        </div>
                        <div className="divide-y divide-slate-700/30">
                            {analyses
                                .sort((a, b) => a.strengthScore - b.strengthScore)
                                .map((item) => (
                                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                                        <div className="flex-1">
                                            <div className="text-white font-medium">{item.name}</div>
                                            <div className="text-slate-400 text-sm">{item.username}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Strength Bar */}
                                            <div className="w-24">
                                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${item.strength === "weak" ? "bg-red-500" : item.strength === "medium" ? "bg-yellow-500" : "bg-green-500"
                                                        }`} style={{ width: `${item.strengthScore}%` }} />
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.strength === "weak" ? "bg-red-500/20 text-red-400" : item.strength === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"
                                                }`}>
                                                {item.strength}
                                            </span>
                                            {/* Issue Badges */}
                                            {item.isReused && <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 font-medium">Reused</span>}
                                            {item.isOld && <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">Old</span>}
                                            {item.breached && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-medium" title={`Found ${item.breachCount} times`}>
                                                    Breached ({item.breachCount}x)
                                                </span>
                                            )}
                                            {item.strength === "strong" && !item.isReused && !item.isOld && !item.breached && (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
