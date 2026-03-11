import { useState } from 'react';
import { useConflict } from '../context/ConflictContext';
import { Server, Monitor, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function ConflictResolver() {
    const { activeConflict, resolveConflict } = useConflict();
    const [showServerPassword, setShowServerPassword] = useState(false);
    const [showLocalPassword, setShowLocalPassword] = useState(false);

    if (!activeConflict) return null;

    const { serverData, localData } = activeConflict;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Sync Conflict Detected</h2>
                        <p className="text-slate-400 text-sm">Please choose which version to keep for "{localData.name}"</p>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Server Version */}
                        <div className="bg-slate-950/50 border border-blue-500/30 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                            <div className="flex items-center gap-2 mb-4 text-blue-400">
                                <Server className="w-5 h-5" />
                                <h3 className="font-semibold">Server Version</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Title</label>
                                    <p className="text-slate-200">{serverData.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Username</label>
                                    <p className="text-slate-200">{serverData.username}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Password</label>
                                    <div className="flex items-center justify-between bg-slate-900 rounded p-2 border border-slate-800 mt-1">
                                        <p className="text-slate-200 font-mono text-sm break-all pt-1">
                                            {showServerPassword ? serverData.password : '••••••••••••••••'}
                                        </p>
                                        <button 
                                            onClick={() => setShowServerPassword(!showServerPassword)}
                                            className="text-slate-400 hover:text-white transition-colors p-1"
                                        >
                                            {showServerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => resolveConflict('server')}
                                className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 max-w-sm mx-auto flex justify-center"
                            >
                                Keep Server Version
                            </button>
                        </div>

                        {/* Local Version */}
                        <div className="bg-slate-950/50 border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                            <div className="flex items-center gap-2 mb-4 text-emerald-400">
                                <Monitor className="w-5 h-5" />
                                <h3 className="font-semibold">Your Local Version</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Title</label>
                                    <p className="text-slate-200">{localData.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Username</label>
                                    <p className="text-slate-200">{localData.username}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Password</label>
                                    <div className="flex items-center justify-between bg-slate-900 rounded p-2 border border-slate-800 mt-1">
                                        <p className="text-slate-200 font-mono text-sm break-all pt-1">
                                            {showLocalPassword ? localData.password : '••••••••••••••••'}
                                        </p>
                                        <button 
                                            onClick={() => setShowLocalPassword(!showLocalPassword)}
                                            className="text-slate-400 hover:text-white transition-colors p-1"
                                        >
                                            {showLocalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => resolveConflict('local')}
                                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 max-w-sm mx-auto flex justify-center"
                            >
                                Keep My Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
