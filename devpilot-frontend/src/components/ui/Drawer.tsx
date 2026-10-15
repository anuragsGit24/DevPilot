import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Drawer (Side Panel) Component
// ============================================================

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const drawerSizes = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[520px]',
  xl: 'w-[680px]',
};

export function Drawer({ open, onClose, title, description, children, footer, side = 'right', size = 'md' }: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 bottom-0 bg-white shadow-dialog flex flex-col',
          side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0',
          drawerSizes[size],
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            {title && <h2 id="drawer-title" className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-slate-200 px-5 py-4 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
