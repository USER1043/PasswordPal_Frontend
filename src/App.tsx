import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import VaultPage from "./pages/VaultPage";
import { SESSION_REVOKED_EVENT } from "./api/axiosClient";

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleRevocation = (event: CustomEvent) => {
      const message = event.detail?.message || "Session expired.";
      setErrorMessage(message);
      setCurrentView("login");
      // Optional: Show alert or notification
      alert(message);
    };

    window.addEventListener(SESSION_REVOKED_EVENT as any, handleRevocation);

    return () => {
      window.removeEventListener(
        SESSION_REVOKED_EVENT as any,
        handleRevocation,
      );
    };
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setErrorMessage(null); // Clear error on navigation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navbar - shown on all pages */}
      <Navbar onNavigate={handleNavigate} currentView={currentView} />

      {/* Page Content */}
      <div className="container mx-auto p-4">
        {errorMessage && currentView === "login" && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded mb-4">
            {errorMessage}
          </div>
        )}
        {currentView === "home" && <LandingPage onNavigate={handleNavigate} />}
        {currentView === "login" && <LoginPage onNavigate={handleNavigate} />}
        {currentView === "register" && (
          <RegisterPage onNavigate={handleNavigate} />
        )}
        {currentView === "vault" && <VaultPage onNavigate={handleNavigate} />}
      </div>
    </div>
  );
}
