// Navigation configuration — drives sidebar items and role-gated visibility
import type { UserRole } from '@/types/domain';
import type { Capability } from '@/types/permissions';

export interface NavItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name (used by Sidebar)
  path: string;
  requiredCapability?: Capability;
  children?: NavItem[];
  badge?: string;
  section?: string;
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', requiredCapability: 'dashboard:view' },
      { id: 'projects', label: 'Projects', icon: 'FolderOpen', path: '/projects', requiredCapability: 'projects:view' },
    ],
  },
  {
    id: 'sdlc',
    label: 'SDLC Workspace',
    items: [
      { id: 'requirements', label: 'Requirements', icon: 'FileText', path: '/projects', requiredCapability: 'requirements:view' },
      { id: 'artifacts', label: 'Artifacts', icon: 'Layers', path: '/projects', requiredCapability: 'artifacts:view' },
      { id: 'sprints', label: 'Sprint Planning', icon: 'Calendar', path: '/projects', requiredCapability: 'sprints:view' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Quality',
    items: [
      { id: 'prompts', label: 'Prompt Library', icon: 'Code2', path: '/prompts', requiredCapability: 'prompts:view' },
      { id: 'evaluations', label: 'Evaluations', icon: 'BarChart3', path: '/projects', requiredCapability: 'evaluations:view' },
      { id: 'case-study', label: 'Case Study', icon: 'BookOpen', path: '/case-study' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'admin-users', label: 'User Management', icon: 'Users', path: '/admin/users', requiredCapability: 'users:manage' },
      { id: 'admin-audit', label: 'Audit Logs', icon: 'Shield', path: '/admin/audit-logs', requiredCapability: 'audit:view' },
      { id: 'admin-config', label: 'Configuration', icon: 'Settings2', path: '/admin/configuration', requiredCapability: 'system:configure' },
    ],
  },
];

export const ROLE_VISIBLE_ITEMS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'projects', 'requirements', 'artifacts', 'sprints', 'prompts', 'evaluations', 'case-study', 'admin-users', 'admin-audit', 'admin-config'],
  project_manager: ['dashboard', 'projects', 'requirements', 'artifacts', 'sprints', 'prompts', 'evaluations', 'case-study'],
  business_analyst: ['dashboard', 'projects', 'requirements', 'artifacts', 'sprints', 'prompts', 'evaluations', 'case-study'],
  developer: ['dashboard', 'projects', 'artifacts', 'sprints', 'prompts', 'evaluations', 'case-study'],
  tester: ['dashboard', 'projects', 'artifacts', 'sprints', 'evaluations', 'case-study'],
};
