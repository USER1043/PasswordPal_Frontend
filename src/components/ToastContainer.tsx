// Toast notification system - displays success, error, warning, and info messages to users
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotification, type ToastType } from '../context/NotificationContext';
import { useEffect, useState } from 'react';

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const colors = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
};

const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
};

export default function ToastContainer() {
    const { toasts, removeToast } = useNotification();

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} {...toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ message, type, onRemove }: { id?: string; message: string; type: ToastType; onRemove: () => void }) {
    const Icon = icons[type];
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    return (
        <div
            className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-lg
        transition-all duration-300 ease-in-out transform
        ${colors[type]}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
            role="alert"
        >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[type]}`} />
            <div className="flex-1 text-sm font-medium leading-relaxed">{message}</div>
            <button
                onClick={onRemove}
                className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${iconColors[type]}`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
