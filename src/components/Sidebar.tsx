import {
    Shield,
    Lock,
    Zap,
    LayoutDashboard,
    Settings,
    LogOut,
    Plus
} from "lucide-react";

interface SidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
    const menuItems = [
        { id: "vault", label: "My Vault", icon: Lock },
        { id: "generator", label: "Generator", icon: Zap },
        { id: "security", label: "Security", icon: Shield },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col h-full">
            {/* App Logo/Header */}
            <div className="p-6 flex items-center gap-3">
                <div className="relative">
                    <Shield className="w-8 h-8 text-purple-400" strokeWidth={2} />
                    <div className="absolute inset-0 bg-purple-500 blur-md opacity-20"></div>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                    PasswordPal
                </span>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 px-4 py-4 space-y-2">
                <button
                    onClick={() => {
                        // Logic to open add modal could go here, or simple navigation
                        onNavigate("vault");
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-900/20 mb-6 flex items-center justify-center gap-2 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span>New Item</span>
                </button>

                <div className="space-y-1">
                    <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Menu
                    </div>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === item.id
                                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent"
                                }`}
                        >
                            <item.icon
                                className={`w-5 h-5 transition-colors ${currentView === item.id
                                        ? "text-purple-400"
                                        : "text-slate-500 group-hover:text-slate-300"
                                    }`}
                            />
                            <span className="font-medium">{item.label}</span>
                            {currentView === item.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-700/50">
                <button
                    onClick={() => onNavigate("login")} // In real app, this would trigger logout logic
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group"
                >
                    <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
