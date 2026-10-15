import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Card Component
// ============================================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ className, padding = 'none', children, ...props }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  return (
    <div
      className={cn('bg-white rounded-lg border border-slate-200 shadow-card', paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export function CardHeader({ className, action, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-slate-100 flex items-center justify-between', className)} {...props}>
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-lg flex items-center', className)} {...props}>
      {children}
    </div>
  );
}

// Metric card
interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  sub?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
}

const metricColors = {
  blue:   { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-600' },
  green:  { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
  amber:  { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
  red:    { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-600' },
  slate:  { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
};

export function MetricCard({ label, value, icon, trend, className, sub, color = 'slate' }: MetricCardProps) {
  const colors = metricColors[color];
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={cn('text-2xl font-bold', colors.text)}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
