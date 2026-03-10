// ============================================================================
// AuditLogPage — Login History & Security Events
// ============================================================================
import { useState, useEffect } from "react";
import {
    Shield, CheckCircle2, XCircle, Clock, Monitor, Globe,
    ChevronLeft, ChevronRight, Loader2, RefreshCw, AlertTriangle,
} from "lucide-react";
import apiClient from "../api/axiosClient";

interface AuditLog {
    id: string;
    ip_address: string;
    was_successful: boolean;
    user_agent: string | null;
    attempt_time: string;
}

interface AuditLogPageProps {
    onNavigate: (view: string) => void;
}

const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AuditLogPage({ onNavigate: _onNavigate }: AuditLogPageProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalSuccess, setTotalSuccess] = useState(0);
    const [totalFailed, setTotalFailed] = useState(0);
    const [page, setPage] = useState(0);
    const [error, setError] = useState("");
    const isOffline = !!localStorage.getItem("offline_token");

    const fetchLogs = async (pageNum: number) => {
        setLoading(true);
        setError("");
        try {
            const response = await apiClient.get("/api/audit-logs", {
                params: { limit: PAGE_SIZE.toString(), offset: (pageNum * PAGE_SIZE).toString() },
            });
            setLogs(response.data.logs);
            setTotal(response.data.total);
            setTotalSuccess(response.data.total_success ?? 0);
            setTotalFailed(response.data.total_failed ?? 0);
        } catch {
            setError("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);


    const totalPages = Math.ceil(total / PAGE_SIZE);

    const parseUserAgent = (ua: string | null): string => {
        if (!ua) return "Unknown Device";
        if (ua.includes("Windows")) return "Windows";
        if (ua.includes("Mac")) return "macOS";
        if (ua.includes("Linux")) return "Linux";
        if (ua.includes("Android")) return "Android";
        if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
        return "Unknown";
    };

    const getBrowserFromUA = (ua: string | null): string => {
        if (!ua) return "Unknown Browser";
        if (ua.includes("Edg/")) return "Edge";
        if (ua.includes("Chrome/")) return "Chrome";
        if (ua.includes("Firefox/")) return "Firefox";
        if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
        if (ua.includes("tauri") || ua.includes("Tauri")) return "PasswordPal Desktop";
        return "Unknown Browser";
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    if (isOffline) {
        return (
            <div className="p-6 space-y-6 flex flex-col items-center justify-center text-center py-20">
                <Shield className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">Audit Logs Unavailable Offline</h3>
                <p className="text-slate-500 max-w-sm">
                    Audit logs are strictly maintained on the secure server to trace recent login activities and geographical IPs. Connect to the internet to view them.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="w-7 h-7 text-purple-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
                        <p className="text-slate-400 text-sm">Login history & security events</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchLogs(page)}
                    className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white hover:border-purple-500/30 transition-all"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-400 text-sm">Total Events</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{total}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-400 text-sm">Successful</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{totalSuccess}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-slate-400 text-sm">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                </div>
            )}

            {/* Log Entries */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-16">
                        <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No login history yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/20 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Status Icon */}
                                    <div className={`p-2 rounded-lg ${log.was_successful
                                        ? "bg-emerald-500/10"
                                        : "bg-red-500/10"
                                        }`}>
                                        {log.was_successful ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-400" />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div>
                                        <p className="text-white font-medium text-sm">
                                            {log.was_successful ? "Successful Login" : "Failed Login Attempt"}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-slate-500 text-xs">
                                                <Monitor className="w-3.5 h-3.5" />
                                                {parseUserAgent(log.user_agent)} · {getBrowserFromUA(log.user_agent)}
                                            </span>
                                            <span className="flex items-center gap-1 text-slate-500 text-xs">
                                                <Globe className="w-3.5 h-3.5" />
                                                {log.ip_address}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-right">
                                    <p className="text-slate-400 text-sm">{formatTime(log.attempt_time)}</p>
                                    <p className="text-slate-600 text-xs mt-0.5">
                                        {new Date(log.attempt_time).toLocaleTimeString("en-US", {
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-sm">
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-slate-400 text-sm px-3">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
