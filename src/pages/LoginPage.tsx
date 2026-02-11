// ============================================================================
// src/pages/LoginPage.tsx
// ============================================================================
import { useState } from "react";
import { Shield, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { useNotification } from "../context/NotificationContext";
// import { invoke } from "@tauri-apps/api/core";
import { authService } from "../services/authService";

// interface LoginResponse moved to authService

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: notifyError } = useNotification();

  const handleLogin = async () => {
    if (!email || !password) {
      notifyError("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      // Zero Knowledge Login Flow
      // 1. Get Params -> 2. Derive Key & Unlock (Rust) -> 3. Authenticate (Backend)
      await authService.login(email, password);

      success("Welcome back! Your vault is unlocked.");
      onNavigate("vault");
    } catch (err: any) {
      console.error("Login Error:", err);
      // Distinguish between User Not Found (404), Bad Auth (401), or other
      if (err.response?.status === 404) {
        notifyError("User not found");
      } else if (err.response?.status === 401) {
        notifyError("Invalid password");
      } else {
        notifyError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Shield className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30"></div>
            </div>
            <h1 className="text-2xl font-bold text-white ml-3">PasswordPal</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-purple-300/80 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Secure beyond the vault</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-400 text-center mb-8">
            Unlock your vault with zero-knowledge encryption
          </p>

          {/* Form Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-purple-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-purple-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Unlocking Vault...
              </>
            ) : (
              "Unlock Vault"
            )}
          </button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{" "}
              <button
                onClick={() => onNavigate("register")}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Create Free Account
              </button>
            </p>
          </div>
        </div>

        {/* Security Info Card */}
        <div className="mt-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-slate-200 font-semibold mb-1">
                Your Privacy is Protected
              </p>
              <p className="text-slate-400 leading-relaxed">
                Your master password never leaves your device. All
                encryption happens locally for maximum security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
