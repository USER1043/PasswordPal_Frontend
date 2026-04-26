// ============================================================================
// App.tsx — Main application with session management and auto-lock
// ============================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationProvider } from "./context/NotificationContext";
import { ConflictProvider } from "./context/ConflictContext";
import ConflictResolver from "./components/ConflictResolver";
import ToastContainer from "./components/ToastContainer";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RecoveryPage from "./pages/RecoveryPage";
import VaultPage from "./pages/VaultPage";
import SettingsPage from "./pages/SettingsPage";
import SecurityDashboardPage from "./pages/SecurityDashboardPage";
import PasswordGeneratorPage from "./pages/PasswordGeneratorPage";
import AuditLogPage from "./pages/AuditLogPage";
import AppLayout from "./components/AppLayout";
import UnlockScreen from "./components/UnlockScreen";
import { SESSION_REVOKED_EVENT, wipe_sensitive_data } from "./api/axiosClient";
import { invoke } from "@tauri-apps/api/core";
import { authService } from "./services/authService";
import { syncOfflineVault } from "./services/vaultService";
import { isServerReachable } from "./services/networkProbe";

const AUTO_LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLIPBOARD_CLEAR_TIMEOUT_MS = 30 * 1000; // 30 seconds

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [showAddModal, setShowAddModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connectivity Observer Effect (Polling)
  useEffect(() => {
    let wasOffline = false;

    // Initial check to bootstrap the SyncStatus child component
    isServerReachable().then(reachable => {
        window.dispatchEvent(new CustomEvent('network-status', { detail: reachable }));
    });

    const interval = setInterval(async () => {
      const reachable = await isServerReachable();

      if (!reachable) {
        wasOffline = true;
        window.dispatchEvent(new CustomEvent('network-status', { detail: false }));
      } else {
        if (wasOffline) {
          wasOffline = false;
          console.log("[Sync] Reconnected — triggering offline vault sync");
          // The critical fix: By invoking syncOfflineVault() FIRST, it synchronously emits 
          // the 'sync-start' event before we emit 'network-status'. This allows React to 
          // seamlessly batch the state transitions and completely eliminates the "Cloud Synced" flicker.
          syncOfflineVault().catch((e: unknown) => console.error("Auto-sync failed:", e));
        }
        window.dispatchEvent(new CustomEvent('network-status', { detail: true }));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Auto-lock: Reset timer on user activity
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
    // Only set timer if user is on an authenticated view
    if (!["login", "register"].includes(currentView)) {
      autoLockTimerRef.current = setTimeout(async () => {
        await wipe_sensitive_data();
        setIsLocked(true);
      }, AUTO_LOCK_TIMEOUT_MS);
    }
  }, [currentView]);

  // Set up activity listeners for auto-lock
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetAutoLockTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetAutoLockTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [resetAutoLockTimer]);

  // Listen for session revocation events from axiosClient
  useEffect(() => {
    const handler = () => {
      setUserEmail("");
      setCurrentView("login");
    };
    window.addEventListener(SESSION_REVOKED_EVENT, handler);
    return () => window.removeEventListener(SESSION_REVOKED_EVENT, handler);
  }, []);

  // Clipboard auto-clear
  useEffect(() => {
    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);

    navigator.clipboard.writeText = async (text: string) => {
      await originalWriteText(text);

      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
      clipboardTimerRef.current = setTimeout(async () => {
        try {
          await originalWriteText("");
        } catch {
          // Clipboard clear may fail if window not focused
        }
      }, CLIPBOARD_CLEAR_TIMEOUT_MS);
    };

    return () => {
      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    };
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setShowAddModal(false);
  };

  // Handle vault unlock after auto-lock
  const handleUnlock = async (password: string) => {
    try {
      // Re-derive keys and unlock vault via Rust
      const { salt, wrapped_mek } = await authService.getParams(userEmail);
      await invoke("login_vault", { password, salt, wrappedMek: wrapped_mek });
      setIsLocked(false);
      resetAutoLockTimer();
    } finally {
      // Overwrite the local password variable on ALL exit paths (success and error)
      password = "";
    }
  };

  // Handle logout from unlock screen
  const handleUnlockCancel = () => {
    setIsLocked(false);
    setUserEmail("");
    setCurrentView("login");
  };

  const renderContent = () => {
    if (currentView === "login") {
      return <LoginPage onNavigate={handleNavigate} onLoginSuccess={(email: string) => setUserEmail(email)} />;
    }

    if (currentView === "register") {
      return <RegisterPage onNavigate={handleNavigate} />;
    }

    if (currentView === "recovery") {
      return <RecoveryPage onNavigate={handleNavigate} />;
    }

    // Authenticated views wrapped in AppLayout
    let pageContent;
    switch (currentView) {
      case "vault":
        pageContent = (
          <VaultPage
            onNavigate={handleNavigate}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
          />
        );
        break;
      case "settings":
        pageContent = <SettingsPage onNavigate={handleNavigate} userEmail={userEmail} />;
        break;
      case "security":
        pageContent = <SecurityDashboardPage onNavigate={handleNavigate} />;
        break;
      case "generator":
        pageContent = <PasswordGeneratorPage onNavigate={handleNavigate} />;
        break;
      case "audit-log":
        pageContent = <AuditLogPage onNavigate={handleNavigate} />;
        break;
      default:
        pageContent = (
          <VaultPage
            onNavigate={handleNavigate}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
          />
        );
    }

    return (
      <AppLayout
        currentView={currentView}
        onNavigate={handleNavigate}
        onAddPassword={() => {
          if (currentView !== "vault") {
            setCurrentView("vault");
          }
          setShowAddModal(true);
        }}
      >
        {pageContent}
      </AppLayout>
    );
  };

  return (
    <ConflictProvider>
      <NotificationProvider>
        {isLocked && (
          <UnlockScreen
            onUnlock={handleUnlock}
            onCancel={handleUnlockCancel}
          />
        )}
        {renderContent()}
        <ConflictResolver />
        <ToastContainer />
      </NotificationProvider>
    </ConflictProvider>
  );
}

export default App;
