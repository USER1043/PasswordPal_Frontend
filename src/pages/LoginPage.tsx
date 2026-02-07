// ============================================================================
// src/pages/LoginPage.tsx
// ============================================================================
import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

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
      // Simulate API call and crypto verification
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo purposes - in real app this would verify against stored hash
      // const isValid = await verifyPassword(password, storedHash, storedSalt);

      success("Welcome back! Your vault is unlocked.");
      onNavigate("vault");
    } catch (err) {
      notifyError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <Shield className="w-16 h-16 text-purple-400" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20"></div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white text-center mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-400 text-center mb-8">
            Unlock your vault securely
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
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-600/50 disabled:to-purple-700/50 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50 transform hover:scale-[1.02] disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Unlocking Vault...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Unlock Vault</span>
                </>
              )}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="mt-6 text-center">
            <button className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
              Forgot master password?
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <button
              onClick={() => onNavigate("register")}
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Create one
            </button>
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
