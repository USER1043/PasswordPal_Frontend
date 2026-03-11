import { useState, useEffect } from "react";
import { isSyncing } from "../services/vaultService";
import { isServerReachable } from "../services/networkProbe";

export default function SyncStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(isSyncing);
    const [lastSyncTime, setLastSyncTime] = useState<string>("Never");

    // Listen to unified network events dispatched by App.tsx to perfectly sync the visual state
    useEffect(() => {
        const handleNetwork = (e: Event) => setIsOnline((e as CustomEvent).detail);
        const handleSyncStart = () => setSyncing(true);
        const handleSyncComplete = () => {
            setLastSyncTime(new Date().toLocaleTimeString());
            setSyncing(false);
        };

        window.addEventListener('network-status', handleNetwork);
        window.addEventListener('sync-start', handleSyncStart);
        window.addEventListener('sync-complete', handleSyncComplete);

        // Initial state sync
        isServerReachable().then(setIsOnline);
        setSyncing(isSyncing);

        return () => {
            window.removeEventListener('network-status', handleNetwork);
            window.removeEventListener('sync-start', handleSyncStart);
            window.removeEventListener('sync-complete', handleSyncComplete);
        };
    }, []);

    const getStatusDetails = () => {
        if (!isOnline) {
            return {
                color: "bg-red-500 shadow-red-500/50",
                text: "Offline Mode",
                tooltip: "Waiting for network connection..."
            };
        }
        if (syncing) {
            return {
                color: "bg-yellow-500 shadow-yellow-500/50 animate-pulse",
                text: "Updating Vault...",
                tooltip: "Synchronizing with cloud..."
            };
        }
        return {
            color: "bg-green-500 shadow-green-500/50",
            text: "Cloud Synced",
            tooltip: `Last successful sync: ${lastSyncTime}`
        };
    };

    const status = getStatusDetails();

    return (
        <div className="group relative flex items-center justify-center py-2 cursor-help">
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] transition-colors duration-300 ${status.color}`} />
                <span className="text-xs font-medium text-slate-400 select-none">{status.text}</span>
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                {status.tooltip}
            </div>
        </div>
    );
}
