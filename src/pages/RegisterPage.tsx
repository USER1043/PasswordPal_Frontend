import { useState } from "react";
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import RecoveryKeyModal from "../components/RecoveryKeyModal";
import { generateRecoveryKey, generateSalt, hashPassword } from "../utils/crypto";
import { registerDevice } from "../services/deviceService";

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
      // Generate salt and hash password
      const salt = await generateSalt();
      const hashedPassword = await hashPassword(masterPassword, salt);

      // Generate recovery key
      const key = await generateRecoveryKey();
      setRecoveryKey(key);

      // TODO: Send registration request to backend
      // await axiosClient.post('/auth/register', { email, hashedPassword, salt });

      // Register device
      await registerDevice();

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show recovery key modal
      setShowRecoveryModal(true);
    } catch (err) {
      setError("Registration failed. Please try again.");
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
      <div className="min-h-screen pt-16 flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
              Create Your Vault
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Start securing your passwords today
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
                    value={masterPassword}
                    onChange={(e) => {
                      setMasterPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    placeholder="Create a strong master password"
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

                {/* Password Strength Indicator */}
                {masterPassword && (
                  <div className="mt-3">
                    <div className="flex gap-1.5 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < passwordStrength
                            ? passwordStrength < 2
                              ? "bg-red-500"
                              : passwordStrength < 4
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            : "bg-slate-700"
                            }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthLabel.color}`}>
                      {strengthLabel.text}
                      {passwordStrength < 3 && " - Try adding symbols or numbers"}
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
                  placeholder="Re-enter your master password"
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-600/50 disabled:to-purple-700/50 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50 transform hover:scale-[1.02] disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <button
                onClick={() => onNavigate("login")}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Key Modal */}
      {showRecoveryModal && (
        <RecoveryKeyModal
          recoveryKey={recoveryKey}
          onClose={() => setShowRecoveryModal(false)}
          onConfirm={handleRecoveryConfirm}
        />
      )}
    </>
  );
}
