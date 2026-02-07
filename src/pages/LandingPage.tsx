
import { Shield, ChevronRight } from "lucide-react";

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0e1014] text-white overflow-hidden relative selection:bg-purple-500/30">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Minimal Header */}
      <header className="px-8 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-white" fill="white" />
          <span className="text-xl font-bold tracking-tight">PasswordPal</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("login")}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => onNavigate("register")}
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center z-10 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs font-medium text-purple-300 mb-8 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          Secure beyond the vault
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent max-w-4xl">
          It's time to rethink <br /> password management.
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-light">
          Protect every credential with proactive, desktop-native defense.
          Zero-knowledge encryption that feels like magic.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => onNavigate("register")}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] flex items-center justify-center gap-2 group"
          >
            Create Free Account
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => onNavigate("login")}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-slate-700 hover:border-slate-600"
          >
            Log In
          </button>
        </div>
      </main>

      {/* Footer / Trust Badge */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-10">
        <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">
          Trusted by Security Experts
        </p>
      </div>
    </div>
  );
}
