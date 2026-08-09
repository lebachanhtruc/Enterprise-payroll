import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, HelpCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  resolve: ((value: boolean) => void) | null;
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmConfig>({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
  });

  // Show Toast
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  // Remove Toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Show Confirm Modal
  const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  // Handle Confirm Click
  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({
      isOpen: false,
      title: '',
      message: '',
      resolve: null,
    });
  };

  // Handle Cancel Click
  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({
      isOpen: false,
      title: '',
      message: '',
      resolve: null,
    });
  };

  return (
    <UIContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toast Notifications Container */}
      <div id="toast-container" className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Custom Confirm Modal */}
      {confirmState.isOpen && (
        <div id="confirm-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div 
            id="confirm-modal-card" 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <HelpCircle size={24} />
                </div>
                <div className="flex-1">
                  <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                    {confirmState.title}
                  </h3>
                  <p id="confirm-modal-message" className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {confirmState.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                id="confirm-modal-btn-cancel"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-modal-btn-confirm"
                onClick={handleConfirm}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-xl transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

// Separate component for Toast auto-dismiss logic
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styleMap = {
    success: {
      bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      icon: <CheckCircle className="text-emerald-500 shrink-0" size={18} />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-100 text-rose-800',
      icon: <AlertCircle className="text-rose-500 shrink-0" size={18} />,
    },
    info: {
      bg: 'bg-indigo-50 border-indigo-100 text-indigo-800',
      icon: <Info className="text-indigo-500 shrink-0" size={18} />,
    },
  };

  const currentStyle = styleMap[toast.type];

  return (
    <div
      id={`toast-${toast.id}`}
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${currentStyle.bg}`}
    >
      {currentStyle.icon}
      <div className="flex-1 text-sm font-medium pr-2 leading-tight">
        {toast.message}
      </div>
      <button
        id={`toast-close-${toast.id}`}
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
