import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Tabs Component
// ============================================================

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'line' | 'pill';
}

export function Tabs({ tabs, activeTab, onChange, className, variant = 'line' }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-slate-100 rounded-lg', className)} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50',
              tab.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {tab.icon && <span className="text-current">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('border-b border-slate-200', className)}>
      <nav className="-mb-px flex gap-0" role="tablist" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              tab.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[1.25rem] text-center',
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// Tab content panel
interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
