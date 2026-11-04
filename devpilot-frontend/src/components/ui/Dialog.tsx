import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
  const descriptionId = React.useId();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50" />
        <DialogPrimitive.Content aria-describedby={description ? descriptionId : undefined} className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] flex flex-col bg-white rounded-xl shadow-dialog',
          dialogSizes[size], className,
        )}>
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
            <div className="min-w-0">
              <DialogPrimitive.Title className={cn('text-base font-semibold text-slate-900', !title && 'sr-only')}>{title || 'Confirmation'}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description id={descriptionId} className="text-sm text-slate-500 mt-1">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="p-1 rounded-md text-slate-500 hover:bg-slate-100 shrink-0" aria-label="Close dialog">×</DialogPrimitive.Close>
          </div>
          {children != null && <div className="px-6 py-4 min-h-0 overflow-y-auto">{children}</div>}
          {footer && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex flex-wrap items-center justify-end gap-3 shrink-0">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}
