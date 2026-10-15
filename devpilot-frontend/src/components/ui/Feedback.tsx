import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Skeleton Loading Components
// ============================================================

interface SkeletonProps {
  className?: string;
  lines?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('bg-slate-200 rounded animate-skeleton', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 p-5 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2 border-b border-slate-200">
        {[120, 80, 60, 60, 40].map((w, i) => (
          <Skeleton key={i} className={`h-3 w-[${w}px]`} style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {[120, 80, 60, 60, 40].map((w, j) => (
            <Skeleton key={j} className="h-3.5" style={{ width: w + Math.random() * 20 - 10 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Empty State Component
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

// ============================================================
// Error State Component
// ============================================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ============================================================
// Loading Spinner
// ============================================================

export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div
      className={cn('border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin-slow', sizes[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}
