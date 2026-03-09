// Registration page - creates new user account with master password and recovery key
import { useState } from "react";
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import RecoveryKeyModal from "../components/RecoveryKeyModal";
// import { generateRecoveryKey, generateSalt, hashPassword } from "../utils/crypto"; // Mock utils unused
import { registerDevice } from "../services/deviceService";
import { authService } from "../services/authService";
// import { invoke } from "@tauri-apps/api/core";

// Interface moved to authService.ts

interface RegisterPageProps {
  onNavigate: (view: string) => void;
}

export default function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getStrengthLabel = () => {
    if (passwordStrength < 2) return { text: "Weak", color: "text-red-400" };
    if (passwordStrength < 3) return { text: "Fair", color: "text-yellow-400" };
    if (passwordStrength < 4) return { text: "Good", color: "text-blue-400" };
    if (passwordStrength < 5)
      return { text: "Strong", color: "text-green-400" };
    return { text: "Very Strong", color: "text-emerald-400" };
  };

  const handleRegister = async () => {
    setError("");

    if (!email || !masterPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (masterPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength < 3) {
      setError("Please choose a stronger master password");
      return;
    }

    setLoading(true);

    try {
      // Use AuthService to handle Zero Knowledge Registration
      const key = await authService.register(email, masterPassword);
      setRecoveryKey(key);

      // Register device (mock for now, but good to keep flow)
      await registerDevice();

      // Show recovery key modal
      setShowRecoveryModal(true);
    } catch (err: unknown) {
      console.error("Registration failed:", err);
      // specific error handling if backend returns useful message
      const axiosErr = err as { response?: { data?: { error?: string } } };
      if (axiosErr.response?.data?.error) {
        setError(axiosErr.response.data.error);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryConfirm = () => {
    setShowRecoveryModal(false);
    onNavigate("login");
  };

  const strengthLabel = getStrengthLabel();

  return (
    <>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
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
              <Key className="w-4 h-4" />
              <span>Zero-knowledge encryption that feels like magic</span>
            </div>
          </div>

          {/* Register Card */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
            <h2 className="text-3xl font-bold text-white text-center mb-2">
              Create Your Vault
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Start securing your passwords with proactive defense
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

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
                    value={masterPassword}
                    onChange={(e) => {
                      setMasterPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    placeholder="Create a strong master password"
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

                {/* Password Strength Indicator */}
                {masterPassword && (
                  <div className="mt-3">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${level <= passwordStrength
                            ? level <= 2
                              ? "bg-red-500"
                              : level <= 3
                                ? "bg-yellow-500"
                                : level <= 4
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                            : "bg-slate-700"
                            }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthLabel.color}`}>
                      {strengthLabel.text}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Master Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your master password"
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-purple-500/50"
                />
              </div>

              {/* Warning Banner */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-yellow-400 font-semibold mb-1">
                      Important!
                    </p>
                    <p className="text-yellow-300/90 leading-relaxed">
                      Your master password cannot be recovered. Save your recovery
                      key after registration.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Free Account"
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                Already have an account?{" "}
                <button
                  onClick={() => onNavigate("login")}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Key Modal */}
      {showRecoveryModal && (
        <RecoveryKeyModal
          recoveryKey={recoveryKey}
          onConfirm={handleRecoveryConfirm}
          onClose={() => setShowRecoveryModal(false)}
        />
      )}
    </>
  );
}
