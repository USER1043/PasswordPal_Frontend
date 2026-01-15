// ============================================================================
// src/pages/LandingPage.tsx - Enhanced Landingpage (Bitwarden-inspired)
// ============================================================================
import {
  Shield,
  Lock,
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  Zap,
  Eye,
  Server,
  Users,
  ArrowRight,
  Check,
  AlertTriangle,
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section with proper navbar spacing */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">
              Zero-Knowledge Architecture
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Secure Password Manager
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              You Control Everything
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Military-grade encryption meets seamless sync across all your
            devices. Your passwords are encrypted on your device before they
            ever reach our servers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => onNavigate("register")}
              className="group bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate("login")}
              className="border-2 border-slate-600 hover:border-purple-500 text-white px-8 py-4 rounded-xl font-semibold transition-all hover:bg-slate-800/50"
            >
              Sign In
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Open source</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need to stay secure
            </h2>
            <p className="text-slate-400 text-lg">
              Zero-knowledge encryption with enterprise-grade security
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                title: "Military-Grade Encryption",
                description:
                  "AES-256-GCM encryption with Argon2id key derivation protects every password",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Eye,
                title: "Zero-Knowledge Architecture",
                description:
                  "Your data is encrypted before it leaves your device. We can never see your passwords.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Zap,
                title: "Instant Sync",
                description:
                  "Changes appear across all devices in real-time with conflict-free merging",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: Server,
                title: "Offline Mode",
                description:
                  "Access and modify your vault without internet. Syncs automatically when reconnected.",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: AlertTriangle,
                title: "Breach Monitoring",
                description:
                  "Get instant alerts if your credentials appear in known data breaches",
                color: "from-yellow-500 to-orange-500",
              },
              {
                icon: Users,
                title: "Secure Sharing",
                description:
                  "Share passwords with team members using end-to-end encryption",
                color: "from-indigo-500 to-purple-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:border-slate-600 transition-all group"
              >
                <div className="relative inline-block mb-4">
                  <feature.icon
                    className="w-12 h-12 text-purple-400 group-hover:text-purple-300 transition-colors"
                    strokeWidth={1.5}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} blur-lg opacity-20 group-hover:opacity-30 transition-opacity`}
                  ></div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Platform Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Access anywhere, on any device
            </h2>
            <p className="text-slate-400 text-lg">
              Native apps for all your platforms
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Smartphone, label: "Mobile Apps", desc: "iOS & Android" },
              { icon: Monitor, label: "Desktop", desc: "Windows, Mac, Linux" },
              {
                icon: Chrome,
                label: "Browser Extension",
                desc: "Chrome, Firefox, Safari",
              },
              {
                icon: Globe,
                label: "Web Vault",
                desc: "Access from any browser",
              },
            ].map((platform, i) => (
              <div
                key={i}
                className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 text-center hover:bg-slate-800/50 transition-all"
              >
                <platform.icon
                  className="w-10 h-10 text-purple-400 mx-auto mb-4"
                  strokeWidth={1.5}
                />
                <h3 className="text-white font-semibold mb-2">
                  {platform.label}
                </h3>
                <p className="text-slate-400 text-sm">{platform.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Guarantees */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for security from day one
            </h2>
            <p className="text-slate-400 text-lg">
              Industry-leading encryption and security practices
            </p>
          </div>

          <div className="space-y-4">
            {[
              "End-to-end encryption with AES-256-GCM",
              "Zero-knowledge architecture - we never see your data",
              "Argon2id key derivation resistant to GPU attacks",
              "Two-factor authentication (TOTP) support",
              "Biometric unlock on mobile devices",
              "Security audit logs and breach monitoring",
              "Encrypted metadata - even URLs are hidden",
              "Open source and independently audited",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4"
              >
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Shield
            className="w-16 h-16 text-purple-400 mx-auto mb-6"
            strokeWidth={1.5}
          />
          <h2 className="text-4xl font-bold text-white mb-4">
            Start securing your digital life today
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Join thousands of users protecting their passwords with
            zero-knowledge encryption
          </p>

          <button
            onClick={() => onNavigate("register")}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50 inline-flex items-center gap-2"
          >
            Create Your Free Account
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-slate-500 text-sm mt-6">
            No credit card required • Free forever plan • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="text-white font-semibold text-lg">
              PasswordPal
            </span>
          </div>

          <div className="flex gap-8 text-sm text-slate-400">
            <button className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button className="hover:text-white transition-colors">
              Terms of Service
            </button>
            <button className="hover:text-white transition-colors">
              Contact
            </button>
          </div>

          <p className="text-slate-500 text-sm">
            © 2025 PasswordPal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
