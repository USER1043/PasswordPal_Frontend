import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
    children: ReactNode;
    currentView: string;
    onNavigate: (view: string) => void;
    onAddPassword: () => void;
}

export default function AppLayout({ children, currentView, onNavigate, onAddPassword }: AppLayoutProps) {
    return (
        <div className="flex h-screen bg-slate-900 overflow-hidden">
            {/* Persistent Sidebar */}
            <Sidebar currentView={currentView} onNavigate={onNavigate} onAddPassword={onAddPassword} />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
                <div className="h-full w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
