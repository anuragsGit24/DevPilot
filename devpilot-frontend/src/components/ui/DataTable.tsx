import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// DataTable Component
// ============================================================

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  className?: string;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
}

interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export function DataTable<T>({
  columns, data, keyExtractor, onRowClick, loading, className, emptyState, stickyHeader,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  };

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sort.key] ?? '');
      const bVal = String((b as Record<string, unknown>)[sort.key] ?? '');
      return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [data, sort]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            {columns.map((_, j) => (
              <div key={j} className="h-4 bg-slate-200 rounded animate-skeleton flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full data-table" role="grid">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : undefined}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(col.className, col.sortable && 'cursor-pointer select-none hover:bg-slate-100')}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-slate-400">
                      {sort?.key === col.key ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render(row, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Pagination
// ============================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, pageSize, onChange, className }: PaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-t border-slate-200', className)}>
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium">{from}–{to}</span> of <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          ← Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'px-2.5 py-1 text-xs rounded border transition-colors',
                p === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
