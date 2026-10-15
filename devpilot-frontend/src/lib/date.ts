import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/** Format ISO date string to display date */
export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, fmt);
}

/** Format ISO date string to display date + time */
export function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, 'dd MMM yyyy, HH:mm');
}

/** Format ISO date string to relative time */
export function formatRelative(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Format sprint date range */
export function formatDateRange(startStr: string, endStr: string): string {
  return `${formatDate(startStr, 'd MMM')} – ${formatDate(endStr, 'd MMM yyyy')}`;
}

/** Format ISO date as chart tick */
export function formatChartDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return format(date, 'MMM yyyy');
}
