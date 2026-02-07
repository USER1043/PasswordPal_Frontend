import {
    Shield,
    AlertTriangle,
    RefreshCw,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronRight,
    Copy,
} from "lucide-react";
import { useState } from "react";

interface SecurityDashboardPageProps {
    onNavigate: (view: string) => void;
}

interface PasswordIssue {
    id: string;
    name: string;
    username: string;
    issue: "weak" | "reused" | "old" | "breached";
    severity: "high" | "medium" | "low";
    lastChanged: string;
}

export default function SecurityDashboardPage({
    onNavigate,
}: SecurityDashboardPageProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Mock data - replace with real security analysis
    const securityScore = 78;
    const totalPasswords = 45;
    const weakPasswords = 8;
    const reusedPasswords = 5;
    const oldPasswords = 12;
    const breachedPasswords = 2;

    const passwordIssues: PasswordIssue[] = [
        {
            id: "1",
            name: "Old Email Account",
            username: "user@oldmail.com",
            issue: "weak",
            severity: "high",
            lastChanged: "2 years ago",
        },
        {
            id: "2",
            name: "Shopping Site",
            username: "shopper123",
            issue: "reused",
            severity: "medium",
            lastChanged: "6 months ago",
        },
        {
            id: "3",
            name: "Social Media",
            username: "myhandle",
            issue: "breached",
            severity: "high",
            lastChanged: "1 year ago",
        },
        {
            id: "4",
            name: "Banking App",
            username: "account@bank.com",
            issue: "old",
            severity: "medium",
            lastChanged: "18 months ago",
        },
    ];

    const filteredIssues =
        selectedCategory === "all"
            ? passwordIssues
            : passwordIssues.filter((issue) => issue.issue === selectedCategory);

    const getIssueIcon = (issue: string) => {
        switch (issue) {
            case "weak":
                return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case "reused":
                return <Copy className="w-5 h-5 text-yellow-400" />;
            case "old":
                return <Clock className="w-5 h-5 text-orange-400" />;
            case "breached":
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-slate-400" />;
        }
    };

    const getIssueLabel = (issue: string) => {
        switch (issue) {
            case "weak":
                return "Weak Password";
            case "reused":
                return "Reused Password";
            case "old":
                return "Old Password";
            case "breached":
                return "Breached";
            default:
                return "Unknown";
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "high":
                return "bg-red-500/20 text-red-400 border-red-500/30";
            case "medium":
                return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            case "low":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            default:
                return "bg-slate-500/20 text-slate-400 border-slate-500/30";
        }
    };

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
                            <h1 className="text-2xl font-bold text-white">
                                Security Dashboard
                            </h1>
                        </div>

                        <button
                            onClick={() => {
                                /* Refresh analysis */
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh Analysis
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Security Score Card */}
                <div className="mb-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-3xl p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                Overall Security Score
                            </h2>
                            <p className="text-slate-400 mb-4">
                                Based on {totalPasswords} passwords in your vault
                            </p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-6xl font-bold text-white">
                                    {securityScore}
                                </span>
                                <span className="text-2xl text-slate-400">/100</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="w-64 h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                                        style={{ width: `${securityScore}%` }}
                                    />
                                </div>
                                <span className="text-sm text-slate-400">Good</span>
                            </div>
                        </div>
                        <div className="relative">
                            <Shield className="w-32 h-32 text-purple-400 opacity-20" />
                            <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Issue Categories Grid */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-red-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                            <span className="text-3xl font-bold text-white">
                                {weakPasswords}
                            </span>
                        </div>
                        <h3 className="text-white font-semibold mb-1">Weak Passwords</h3>
                        <p className="text-slate-400 text-sm">
                            Easy to guess or crack
                        </p>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <Copy className="w-8 h-8 text-yellow-400" />
                            <span className="text-3xl font-bold text-white">
                                {reusedPasswords}
                            </span>
                        </div>
                        <h3 className="text-white font-semibold mb-1">Reused Passwords</h3>
                        <p className="text-slate-400 text-sm">
                            Used on multiple sites
                        </p>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-orange-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 text-orange-400" />
                            <span className="text-3xl font-bold text-white">
                                {oldPasswords}
                            </span>
                        </div>
                        <h3 className="text-white font-semibold mb-1">Old Passwords</h3>
                        <p className="text-slate-400 text-sm">
                            Not changed in 6+ months
                        </p>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-red-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <XCircle className="w-8 h-8 text-red-500" />
                            <span className="text-3xl font-bold text-white">
                                {breachedPasswords}
                            </span>
                        </div>
                        <h3 className="text-white font-semibold mb-1">Breached</h3>
                        <p className="text-slate-400 text-sm">
                            Found in data breaches
                        </p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === "all"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50"
                            }`}
                    >
                        All Issues ({passwordIssues.length})
                    </button>
                    <button
                        onClick={() => setSelectedCategory("weak")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === "weak"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50"
                            }`}
                    >
                        Weak ({weakPasswords})
                    </button>
                    <button
                        onClick={() => setSelectedCategory("reused")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === "reused"
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50"
                            }`}
                    >
                        Reused ({reusedPasswords})
                    </button>
                    <button
                        onClick={() => setSelectedCategory("breached")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === "breached"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50"
                            }`}
                    >
                        Breached ({breachedPasswords})
                    </button>
                </div>

                {/* Issues List */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">
                        Password Issues Requiring Attention
                    </h3>

                    <div className="space-y-3">
                        {filteredIssues.map((issue) => (
                            <div
                                key={issue.id}
                                className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                                            {getIssueIcon(issue.issue)}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-white font-semibold">
                                                    {issue.name}
                                                </h4>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(
                                                        issue.severity
                                                    )}`}
                                                >
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-sm mb-1">
                                                {issue.username}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span>{getIssueLabel(issue.issue)}</span>
                                                <span>•</span>
                                                <span>Last changed {issue.lastChanged}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        Fix Now
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredIssues.length === 0 && (
                        <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                All Clear!
                            </h3>
                            <p className="text-slate-400">
                                No {selectedCategory} password issues found
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
