import { useState } from "react";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import VaultPage from "./pages/VaultPage";

export default function App() {
  const [currentView, setCurrentView] = useState("home");

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navbar - shown on all pages */}
      <Navbar onNavigate={handleNavigate} currentView={currentView} />

      {/* Page Content */}
      {currentView === "home" && <LandingPage onNavigate={handleNavigate} />}
      {currentView === "login" && <LoginPage onNavigate={handleNavigate} />}
      {currentView === "register" && (
        <RegisterPage onNavigate={handleNavigate} />
      )}
      {currentView === "vault" && <VaultPage onNavigate={handleNavigate} />}
    </div>
  );
}
