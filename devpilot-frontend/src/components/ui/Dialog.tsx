import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// ============================================================
// Dialog (Modal) Component
// ============================================================

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const dialogSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
};

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'fixed inset-0 z-50 bg-transparent p-0 overflow-visible',
        'backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm',
      )}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'bg-white rounded-xl shadow-dialog w-full animate-fade-in',
            dialogSizes[size],
            className,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'dialog-title' : undefined}
          aria-describedby={description ? 'dialog-description' : undefined}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 id="dialog-title" className="text-base font-semibold text-slate-900">{title}</h2>
                {description && <p id="dialog-description" className="text-sm text-slate-500 mt-0.5">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

// ============================================================
// Confirm Dialog
// ============================================================

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={cn('w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center',
          variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600')}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </Dialog>
  );
}
