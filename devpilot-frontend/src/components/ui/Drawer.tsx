import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

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
const drawerSizes = { sm: 'w-80', md: 'w-96', lg: 'w-[520px]', xl: 'w-[680px]' };

export function Drawer({ open, onClose, title, description, children, footer, side = 'right', size = 'md' }: DrawerProps) {
  const descriptionId = React.useId();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
        <DialogPrimitive.Content className={cn('fixed inset-y-0 z-50 max-w-[100vw] bg-white shadow-dialog flex flex-col', side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0', drawerSizes[size])} aria-describedby={description ? descriptionId : undefined}>
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 shrink-0">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-slate-900">{title || 'Details'}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description id={descriptionId} className="text-xs text-slate-500 mt-0.5">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="p-2 rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close panel">×</DialogPrimitive.Close>
          </div>
          <div className={cn('flex-1 min-h-0 overflow-y-auto', title !== 'Navigation' && 'px-5 py-4')}>{children}</div>
          {footer && <div className="shrink-0 border-t border-slate-200 px-5 py-4 flex flex-wrap justify-end gap-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
