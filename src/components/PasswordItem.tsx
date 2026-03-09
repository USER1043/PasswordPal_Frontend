// Individual password card - displays password details with copy, show/hide, edit, and delete actions
import { Globe, Copy, Eye, EyeOff, MoreVertical, Trash2, Edit } from "lucide-react";
import { useState } from "react";
interface PasswordItemProps {
    id: string;
    name: string;
    username: string;
    password: string;
    url?: string;
    folder?: string;
    lastModified: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}
export default function PasswordItem({
    id,
    name,
    username,
    password,
    url,
    folder,
    lastModified,
    onEdit,
    onDelete,
}: PasswordItemProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleCopy = async (text: string, _type: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getFavicon = (url?: string) => {
        if (!url) return null;
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return null;
        }
    };

    return (
        <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-purple-500/50 transition-all">
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    {getFavicon(url) ? (
                        <img src={getFavicon(url)!} alt="" className="w-6 h-6" />
                    ) : (
                        <Globe className="w-6 h-6 text-purple-400" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                            <h3 className="text-white font-semibold truncate">{name}</h3>
                            <p className="text-slate-400 text-sm truncate">{username}</p>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-8 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 min-w-[160px]">
                                        <button
                                            onClick={() => {
                                                onEdit(id);
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-white hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                onDelete(id);
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-slate-900/50 rounded-lg px-3 py-2 font-mono text-sm text-slate-300">
                            {showPassword ? password : "••••••••••••"}
                        </div>
                        <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            title={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            onClick={() => handleCopy(password, "password")}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="Copy password"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        {folder && <span className="flex items-center gap-1">📁 {folder}</span>}
                        <span>Modified {lastModified}</span>
                    </div>
                </div>
            </div>

            {/* Copy Notification */}
            {copied && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-fade-in">
                    Copied!
                </div>
            )}
        </div>
    );
}
