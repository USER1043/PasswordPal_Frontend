/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface NotificationContextType {
    toasts: Toast[];
    showToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Date.now().toString();
        const newToast = { id, message, type };
        setToasts((prev) => [...prev, newToast]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, [removeToast]);

    const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
    const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
    const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);
    const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

    // Listen for custom notify events from non-React environments (like vaultService)
    useEffect(() => {
        const handleNotify = (e: Event) => {
            const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
            if (customEvent.detail?.message && customEvent.detail?.type) {
                showToast(customEvent.detail.message, customEvent.detail.type);
            }
        };
        window.addEventListener('notify', handleNotify);
        return () => window.removeEventListener('notify', handleNotify);
    }, [showToast]);

    return (
        <NotificationContext.Provider value={{ toasts, showToast, removeToast, success, error, info, warning }}>
            {children}
        </NotificationContext.Provider>
    );
};
