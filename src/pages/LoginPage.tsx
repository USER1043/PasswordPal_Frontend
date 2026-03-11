// ============================================================================
// LoginPage — Zero-Knowledge Login with MFA Challenge Support
// Includes: localStorage-based email suggestions (Tauri WebView has no native
// browser credential manager, so we implement our own suggestion dropdown)
// ============================================================================
import { useState, useEffect, useRef } from "react";
import { Shield, Eye, EyeOff, Loader2, Sparkles, KeyRound, User } from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { authService } from "../services/authService";
import * as totpService from "../services/totpService";
import AppLogo from "../components/common/AppLogo";

const STORED_EMAILS_KEY = "passwordpal_recent_emails";

function getStoredEmails(): string[] {
  try {
    const raw = localStorage.getItem(STORED_EMAILS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEmail(email: string) {
  const emails = getStoredEmails();
  const filtered = emails.filter((e) => e !== email);
  const updated = [email, ...filtered].slice(0, 5); // keep last 5 unique emails
  localStorage.setItem(STORED_EMAILS_KEY, JSON.stringify(updated));
}

interface LoginPageProps {
  onNavigate: (view: string) => void;
  onLoginSuccess?: (email: string) => void;
}

export default function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: notifyError } = useNotification();

  // Email suggestion dropdown state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Populate suggestions when email input changes
  useEffect(() => {
    const stored = getStoredEmails();
    if (email.trim() === "") {
      setSuggestions(stored);
    } else {
      setSuggestions(stored.filter((e) => e.toLowerCase().startsWith(email.toLowerCase())));
    }
  }, [email]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        emailRef.current &&
        !emailRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      notifyError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      // Generate a fresh, isolated device fingerprint purely for this specific login attempt
      const deviceId = crypto.randomUUID();

      const result = await authService.login(email, password, deviceId);

      if (result.mfa_required) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      // Save email to suggestions on successful login
      saveEmail(email);
      success("Welcome back! Your vault is unlocked.");
      onLoginSuccess?.(email);
      onNavigate("vault");
    } catch (err: unknown) {
      console.error("Login Error:", err);
      // Handle Rust Tauri errors (thrown as strings when local decryption fails)
      if (typeof err === "string" && err.includes("Invalid password")) {
        notifyError("Email or password incorrect");
        return;
      }

      // Handle Backend HTTP errors
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404 || status === 401) {
        notifyError("Email or password incorrect");
      } else if (status === 429) {
        notifyError("Too many login attempts. Please wait.");
      } else {
        notifyError("Internal server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaCode) {
      notifyError("Please enter your authentication code");
      return;
    }

    setLoading(true);
    try {
      if (useBackupCode) {
        await totpService.redeemBackupCode(mfaCode);
      } else {
        await totpService.verifyLogin(mfaCode);
      }

      // MFA complete — save email and navigate to vault
      saveEmail(email);
      success("Welcome back! Your vault is unlocked.");
      onLoginSuccess?.(email);
      onNavigate("vault");
    } catch (err: unknown) {
      console.error("MFA Error:", err);
      notifyError(useBackupCode ? "Invalid backup code" : "Invalid authentication code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <AppLogo size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2 text-purple-300/80 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Secure beyond the vault</span>
          </div>
        </div>

        {/* Login / MFA Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
          {!mfaRequired ? (
            <>
              <h2 className="text-3xl font-bold text-white text-center mb-2">
                Welcome Back
              </h2>
              <p className="text-slate-400 text-center mb-8">
                Unlock your vault with zero-knowledge encryption
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
                {/* Email field with suggestion dropdown */}
                <div className="relative">
                  <label htmlFor="email-input" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email-input"
                    ref={emailRef}
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="you@example.com"
                    autoComplete="off"
                    className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-purple-500/50"
                  />

                  {/* Custom Suggestion Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-slate-900 border border-purple-500/30 rounded-xl shadow-xl overflow-hidden"
                    >
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent blur before click
                            setEmail(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-purple-500/10 transition-colors border-b border-slate-800/50 last:border-b-0"
                        >
                          <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span className="text-sm truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="password-input" className="block text-sm font-medium text-slate-300 mb-2">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your master password"
                      autoComplete="current-password"
                      className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-purple-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
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
              </form>

              <div className="mt-6 text-center space-y-3">
                <button
                  onClick={() => onNavigate("recovery")}
                  className="text-slate-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Forgot your password? Use recovery key
                </button>
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
            </>
          ) : (
            <>
              {/* MFA Challenge */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                  <KeyRound className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Two-Factor Authentication
                </h2>
                <p className="text-slate-400 text-sm">
                  {useBackupCode
                    ? "Enter one of your backup recovery codes"
                    : "Enter the 6-digit code from your authenticator app"}
                </p>
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ""))}
                  placeholder={useBackupCode ? "XXXXXXXXXX" : "000000"}
                  maxLength={useBackupCode ? 10 : 6}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleMfaVerify()}
                  className="w-full bg-slate-950/50 border border-purple-500/30 rounded-xl px-4 py-4 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>

              <button
                onClick={handleMfaVerify}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </button>

              <div className="mt-4 text-center space-y-2">
                <button
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setMfaCode("");
                  }}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  {useBackupCode ? "Use authenticator code" : "Use a backup code instead"}
                </button>
                <br />
                <button
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaCode("");
                  }}
                  className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security Info */}
        {!mfaRequired && (
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
        )}
      </div>
    </div>
  );
}
