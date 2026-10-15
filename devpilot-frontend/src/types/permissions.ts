// ============================================================
// RBAC Capability Matrix — DevPilot
// Source: docs/features/AUTHENTICATION_AND_RBAC.md
// This is a DEMO-ONLY representation. No server-side enforcement.
// ============================================================

import type { UserRole } from './domain';

export type Capability =
  | 'users:manage'
  | 'system:configure'
  | 'audit:view'
  | 'projects:create'
  | 'projects:manage'
  | 'projects:view'
  | 'requirements:ingest'
  | 'requirements:edit'
  | 'requirements:view'
  | 'artifacts:generate'
  | 'artifacts:review'
  | 'artifacts:view'
  | 'prompts:manage'
  | 'prompts:activate'
  | 'prompts:view'
  | 'evaluations:run'
  | 'evaluations:review'
  | 'evaluations:view'
  | 'dashboard:view'
  | 'exports:create'
  | 'assistant:use'
  | 'sprints:manage'
  | 'sprints:view';

export const ALL_CAPABILITIES: Capability[] = [
  'users:manage',
  'system:configure',
  'audit:view',
  'projects:create',
  'projects:manage',
  'projects:view',
  'requirements:ingest',
  'requirements:edit',
  'requirements:view',
  'artifacts:generate',
  'artifacts:review',
  'artifacts:view',
  'prompts:manage',
  'prompts:activate',
  'prompts:view',
  'evaluations:run',
  'evaluations:review',
  'evaluations:view',
  'dashboard:view',
  'exports:create',
  'assistant:use',
  'sprints:manage',
  'sprints:view',
];

export const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  admin: [
    'users:manage',
    'system:configure',
    'audit:view',
    'projects:create',
    'projects:manage',
    'projects:view',
    'requirements:ingest',
    'requirements:edit',
    'requirements:view',
    'artifacts:generate',
    'artifacts:review',
    'artifacts:view',
    'prompts:manage',
    'prompts:activate',
    'prompts:view',
    'evaluations:run',
    'evaluations:review',
    'evaluations:view',
    'dashboard:view',
    'exports:create',
    'assistant:use',
    'sprints:manage',
    'sprints:view',
  ],
  project_manager: [
    'projects:create',
    'projects:manage',
    'projects:view',
    'requirements:ingest',
    'requirements:edit',
    'requirements:view',
    'artifacts:generate',
    'artifacts:review',
    'artifacts:view',
    'prompts:view',
    'evaluations:run',
    'evaluations:review',
    'evaluations:view',
    'dashboard:view',
    'exports:create',
    'assistant:use',
    'sprints:manage',
    'sprints:view',
  ],
  business_analyst: [
    'projects:view',
    'requirements:ingest',
    'requirements:edit',
    'requirements:view',
    'artifacts:generate',
    'artifacts:review',
    'artifacts:view',
    'prompts:view',
    'evaluations:run',
    'evaluations:review',
    'evaluations:view',
    'dashboard:view',
    'exports:create',
    'assistant:use',
    'sprints:view',
  ],
  developer: [
    'projects:view',
    'requirements:view',
    'artifacts:generate',
    'artifacts:review',
    'artifacts:view',
    'prompts:view',
    'evaluations:view',
    'dashboard:view',
    'exports:create',
    'assistant:use',
    'sprints:view',
  ],
  tester: [
    'projects:view',
    'requirements:view',
    'artifacts:generate',
    'artifacts:review',
    'artifacts:view',
    'prompts:view',
    'evaluations:run',
    'evaluations:review',
    'evaluations:view',
    'dashboard:view',
    'exports:create',
    'assistant:use',
    'sprints:view',
  ],
};

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function getRoleCapabilities(role: UserRole): Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  project_manager: 'Project Manager',
  business_analyst: 'Business Analyst',
  developer: 'Developer',
  tester: 'Tester',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  project_manager: 'bg-blue-100 text-blue-700',
  business_analyst: 'bg-teal-100 text-teal-700',
  developer: 'bg-indigo-100 text-indigo-700',
  tester: 'bg-orange-100 text-orange-700',
};
