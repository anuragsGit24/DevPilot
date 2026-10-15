import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Truncate string to max length with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert snake_case to Title Case */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map(capitalize)
    .join(' ');
}

/** Simple debounce */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Generate a mock ID */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Sleep for a given ms — used to simulate async operations */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Get percentage */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/** Get score color class */
export function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

/** Get score bg color */
export function scoreBgColor(score: number): string {
  if (score >= 75) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

/** Filter and sort items */
export function filterItems<T>(
  items: T[],
  search: string,
  searchFields: (keyof T)[],
): T[] {
  if (!search.trim()) return items;
  const q = search.toLowerCase();
  return items.filter((item) =>
    searchFields.some((field) => {
      const val = item[field];
      if (typeof val === 'string') return val.toLowerCase().includes(q);
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(q));
      return false;
    }),
  );
}
