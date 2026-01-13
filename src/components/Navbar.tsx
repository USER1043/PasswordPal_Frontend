// ============================================================================
// src/components/Navbar.tsx
// ============================================================================
import React, { useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export default function Navbar({ onNavigate, currentView }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', view: 'home' },
    { name: 'Features', view: 'home', scroll: 'features' },
    { name: 'Pricing', view: 'home', scroll: 'pricing' },
    { name: 'Resources', view: 'home', scroll: 'resources' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <Shield className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" strokeWidth={2} />
              <div className="absolute inset-0 bg-purple-500 blur-md opacity-20 group-hover:opacity-30 transition-opacity"></div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
              SecureVault
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => onNavigate(link.view)}
                className={`text-sm font-medium transition-colors ${
                  currentView === link.view
                    ? 'text-purple-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-300 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => {
                  onNavigate(link.view);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === link.view
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                {link.name}
              </button>
            ))}
            
            <div className="pt-3 border-t border-slate-700/50 space-y-2">
              <button
                onClick={() => {
                  onNavigate('login');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  onNavigate('register');
                  setMobileMenuOpen(false);
                }}
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}