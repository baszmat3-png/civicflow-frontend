import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-24 lg:bottom-5 left-3 right-3 sm:right-auto sm:left-5 z-[9999] flex flex-col gap-2 sm:max-w-md pointer-events-none">
        {toasts.map((toast) => {
          const bgColors = {
            success: 'cf-toast cf-toast-success',
            error: 'cf-toast cf-toast-error',
            warning: 'cf-toast cf-toast-warning',
            info: 'cf-toast cf-toast-info',
          };

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--toast-accent)' }} />,
            error: <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--toast-accent)' }} />,
            warning: <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: 'var(--toast-accent)' }} />,
            info: <Info className="w-5 h-5 shrink-0" style={{ color: 'var(--toast-accent)' }} />,
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all ${bgColors[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 text-sm">
                <h4 className="font-bold">{toast.title}</h4>
                {toast.message && <p className="mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
