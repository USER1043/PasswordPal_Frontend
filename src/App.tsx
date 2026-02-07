
import { useState, useEffect } from "react";
// Removed Navbar since we have Sidebar now for authenticated pages
// and Minimal Header for Landing Page
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import VaultPage from "./pages/VaultPage";
import SecurityDashboardPage from "./pages/SecurityDashboardPage";
import PasswordGeneratorPage from "./pages/PasswordGeneratorPage";
import SettingsPage from "./pages/SettingsPage";
import { SESSION_REVOKED_EVENT } from "./api/axiosClient";
import { NotificationProvider } from "./context/NotificationContext";
import ToastContainer from "./components/ToastContainer";

export default function App() {
  const [currentView, setCurrentView] = useState("home");

  useEffect(() => {
    // Need to handle session revocation here or inside a child component that uses the notification context
    // Ideally, we move the listener inside a child component of NotificationProvider or use a ref access
  }, []);

  // Wrapper component to handle notifications dependent on context
  const AppContent = () => {
    const handleNavigate = (view: string) => {
      setCurrentView(view);
    };

    // Views that are part of the "Authenticated App"
    const isAuthView = ["vault", "security", "generator", "settings"].includes(currentView);

    return (
      <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-purple-500/30">
        <ToastContainer />
        {!isAuthView ? (
          <>
            {currentView === "home" && <LandingPage onNavigate={handleNavigate} />}
            {currentView === "login" && <LoginPage onNavigate={handleNavigate} />}
            {currentView === "register" && <RegisterPage onNavigate={handleNavigate} />}
          </>
        ) : (
          <AppLayout currentView={currentView} onNavigate={handleNavigate}>
            {currentView === "vault" && <VaultPage onNavigate={handleNavigate} />}
            {currentView === "security" && <SecurityDashboardPage onNavigate={handleNavigate} />}
            {currentView === "generator" && <PasswordGeneratorPage onNavigate={handleNavigate} />}
            {currentView === "settings" && <SettingsPage onNavigate={handleNavigate} />}
          </AppLayout>
        )}
      </div>
    );
  };

  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}
