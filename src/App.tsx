import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navbar - shown on all pages */}
      <Navbar onNavigate={handleNavigate} currentView={currentView} />
      
      {/* Page Content */}
      {currentView === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentView === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentView === 'register' && <RegisterPage onNavigate={handleNavigate} />}
    </div>
  );
}