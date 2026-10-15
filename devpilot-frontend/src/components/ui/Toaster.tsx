import React from 'react';
import { cn } from '@/lib/utils';
import { useToast, type Toast } from '@/app/providers/ToastProvider';

// ============================================================
// Toaster — renders toast notifications
// ============================================================

const toastIcons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const toastStyles: Record<string, string> = {
  success: 'border-l-green-500 bg-white',
  error:   'border-l-red-500 bg-white',
  warning: 'border-l-amber-500 bg-white',
  info:    'border-l-blue-500 bg-white',
};

const toastIconStyles: Record<string, string> = {
  success: 'bg-green-100 text-green-600',
  error:   'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info:    'bg-blue-100 text-blue-600',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-card border border-slate-200 border-l-4 animate-fade-in',
        'max-w-sm w-full',
        toastStyles[toast.variant],
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={cn('w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5', toastIconStyles[toast.variant])}>
        {toastIcons[toast.variant]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.description && <p className="text-xs text-slate-600 mt-0.5">{toast.description}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
