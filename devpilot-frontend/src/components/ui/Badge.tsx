import React from 'react';
import { cn } from '@/lib/utils';
import type { ArtifactStatus, RequirementStatus, PromptVersionStatus, SprintStatus } from '@/types/domain';

// ============================================================
// Badge / StatusBadge Components
// ============================================================

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 text-slate-600 border border-slate-200',
  primary:  'bg-blue-100 text-blue-700 border border-blue-200',
  success:  'bg-green-100 text-green-700 border border-green-200',
  warning:  'bg-amber-100 text-amber-700 border border-amber-200',
  danger:   'bg-red-100 text-red-700 border border-red-200',
  info:     'bg-indigo-100 text-indigo-700 border border-indigo-200',
  outline:  'bg-transparent text-slate-600 border border-slate-300',
};

const badgeSizes = {
  xs: 'px-1.5 py-0.5 text-2xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ variant = 'default', size = 'sm', className, children, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        badgeVariants[variant],
        badgeSizes[size],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full bg-current')} />}
      {children}
    </span>
  );
}

// Artifact status badge
const artifactStatusConfig: Record<ArtifactStatus, { label: string; variant: BadgeVariant; dot?: boolean }> = {
  draft:     { label: 'Draft', variant: 'default', dot: true },
  in_review: { label: 'In Review', variant: 'warning', dot: true },
  accepted:  { label: 'Accepted', variant: 'success', dot: true },
  rejected:  { label: 'Rejected', variant: 'danger', dot: true },
};

export function ArtifactStatusBadge({ status }: { status: ArtifactStatus }) {
  const config = artifactStatusConfig[status];
  return <Badge variant={config.variant} dot={config.dot}>{config.label}</Badge>;
}

// Requirement status badge
const reqStatusConfig: Record<RequirementStatus, { label: string; variant: BadgeVariant }> = {
  extracted:  { label: 'Extracted', variant: 'default' },
  in_review:  { label: 'In Review', variant: 'warning' },
  confirmed:  { label: 'Confirmed', variant: 'success' },
  rejected:   { label: 'Rejected', variant: 'danger' },
};

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const config = reqStatusConfig[status];
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

// Prompt version status badge
const promptStatusConfig: Record<PromptVersionStatus, { label: string; variant: BadgeVariant }> = {
  draft:   { label: 'Draft', variant: 'default' },
  tested:  { label: 'Tested', variant: 'info' },
  active:  { label: 'Active', variant: 'success' },
  retired: { label: 'Retired', variant: 'outline' },
};

export function PromptStatusBadge({ status }: { status: PromptVersionStatus }) {
  const config = promptStatusConfig[status];
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

// Sprint status badge
const sprintStatusConfig: Record<SprintStatus, { label: string; variant: BadgeVariant }> = {
  planning:  { label: 'Planning', variant: 'default' },
  active:    { label: 'Active', variant: 'primary' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const config = sprintStatusConfig[status];
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

// Priority badge
const priorityConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  must:   { label: 'Must', variant: 'danger' },
  should: { label: 'Should', variant: 'warning' },
  could:  { label: 'Could', variant: 'info' },
  wont:   { label: "Won't", variant: 'default' },
  critical: { label: 'Critical', variant: 'danger' },
  high:   { label: 'High', variant: 'warning' },
  medium: { label: 'Medium', variant: 'info' },
  low:    { label: 'Low', variant: 'default' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] ?? { label: priority, variant: 'default' as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
