import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Input Components
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            aria-invalid={!!error}
            className={cn(
              'form-input',
              icon && 'pl-9',
              iconRight && 'pr-9',
              error && 'border-red-400 focus:ring-red-500',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              {iconRight}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="form-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-400 mt-1">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ============================================================
// Textarea
// ============================================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={!!error}
          className={cn(
            'form-input min-h-[80px] resize-y',
            error && 'border-red-400 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="form-error" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-400 mt-1">{hint}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

// ============================================================
// Select
// ============================================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={!!error}
          className={cn(
            'form-input pr-8 appearance-none cursor-pointer',
            error && 'border-red-400 focus:ring-red-500',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={`${inputId}-error`} className="form-error" role="alert">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

// ============================================================
// Search Input
// ============================================================

interface SearchInputProps extends Omit<InputProps, 'icon'> {
  onClear?: () => void;
}

export function SearchInput({ value, onClear, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        }
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute inset-y-0 right-2 flex items-center px-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
