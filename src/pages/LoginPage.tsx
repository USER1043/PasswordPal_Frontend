// ============================================================================
// src/pages/LoginPage.tsx
// ============================================================================
import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !masterPassword) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // TODO: Implement real authentication with crypto logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Login successful! (Demo - implement real crypto logic)');
    } catch (err) {
      setError('Invalid email or password');
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
          
          <h2 className="text-3xl font-bold text-white text-center mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-center mb-8">Unlock your vault securely</p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3 animate-shake">
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
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter your master password"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
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
              <p className="text-slate-200 font-semibold mb-1">Zero-Knowledge Security</p>
              <p className="text-slate-400 leading-relaxed">
                Your master password is never sent to our servers. All encryption happens locally on your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}