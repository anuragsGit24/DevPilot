import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// CodeBlock — syntax-highlighted code viewer
// ============================================================

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  maxHeight?: string;
}

export function CodeBlock({ code, language = 'yaml', title, className, maxHeight = '400px' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('rounded-lg border border-slate-200 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <div className="w-3 h-3 rounded-full bg-amber-500 opacity-80" />
            <div className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
          </div>
          {title && <span className="text-xs text-slate-400 font-mono ml-2">{title}</span>}
          <span className="text-xs text-slate-500 font-mono">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div
        className="bg-slate-900 overflow-auto font-mono text-xs leading-relaxed p-4"
        style={{ maxHeight }}
      >
        <pre className="text-slate-300 whitespace-pre-wrap break-words">{code}</pre>
      </div>
    </div>
  );
}

// ============================================================
// Progress Bar
// ============================================================

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'amber' | 'red';
  showLabel?: boolean;
  className?: string;
}

const progressColors = {
  blue:  'bg-blue-600',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red:   'bg-red-500',
};

export function ProgressBar({ value, max = 100, label, size = 'md', color = 'blue', showLabel = false, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const sizes = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-xs text-slate-600">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-slate-700">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={cn('w-full bg-slate-100 rounded-full overflow-hidden', sizes[size])}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', progressColors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Avatar
// ============================================================

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-red-100 text-red-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const colorIdx = name.charCodeAt(0) % avatarColors.length;
  const colorClass = avatarColors[colorIdx];

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        avatarSizes[size],
        colorClass,
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
