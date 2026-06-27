'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const noopShowToast: ToastContextType['showToast'] = () => {
  // Intentionally no-op
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fail-safe: some routes may not mount ToastProvider.
    // We prefer a no-op toast over crashing the entire app.
    return {
      showToast: noopShowToast,
    };
  }
  return context;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-success-600" />,
  error: <AlertCircle className="w-5 h-5 text-error-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning-600" />,
  info: <Info className="w-5 h-5 text-brand-600" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-success-200 bg-success-50',
  error: 'border-error-200 bg-error-50',
  warning: 'border-warning-200 bg-warning-50',
  info: 'border-brand-200 bg-brand-50',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-start gap-3 p-4 rounded-xl border-2 shadow-medium
              animate-slide-up backdrop-blur-lg
              ${toastStyles[toast.type]}
            `}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toastIcons[toast.type]}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-sm text-gray-600 mt-1">
                  {toast.message}
                </p>
              )}
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
