import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';

// ============================================================
// Toast / Notification System
// ============================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts.slice(-4), action.toast] }; // max 5
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const idRef = useRef(0);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = `toast-${++idRef.current}`;
    const duration = options.duration ?? 5000;
    dispatch({ type: 'ADD', toast: { ...options, id } });
    if (duration > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
