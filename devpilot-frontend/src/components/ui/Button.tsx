import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Button Component
// ============================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-500 text-white shadow-sm focus-visible:ring-blue-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 focus-visible:ring-slate-400',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-400',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500',
  outline:   'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs rounded gap-1.5',
  sm: 'px-3 py-1.5 text-sm rounded gap-2',
  md: 'px-4 py-2 text-sm rounded-md gap-2',
  lg: 'px-5 py-2.5 text-base rounded-md gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, iconRight, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-slow" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
      </button>
    );
  },
);
Button.displayName = 'Button';
