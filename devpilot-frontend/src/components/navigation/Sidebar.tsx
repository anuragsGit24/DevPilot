import type { ElementType } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { ROLE_LABELS } from '@/types/permissions';
import { Avatar } from '@/components/ui/Misc';
import {
  LayoutDashboard, FolderOpen, FileText, Layers, Calendar,
  Code2, BarChart3, BookOpen, Users, Shield, Settings2, GitBranch,
  PanelLeftClose, PanelLeftOpen, MessageSquare, LogOut, Settings,
  SlidersHorizontal, Download,
} from 'lucide-react';

type NavItem = { label: string; path: string; icon: ElementType; exact?: boolean };

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.path} end={item.exact} title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => cn('sidebar-link', isActive && 'is-active', collapsed && 'is-collapsed')}>
      <Icon size={17} strokeWidth={1.7} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const { projects } = useProjectData();
  const { pathname } = useLocation();
  const projectId = /^\/projects\/([^/]+)/.exec(pathname)?.[1];
  const project = projects.find((item) => item.id === projectId);

  const mainItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Projects', path: '/projects', icon: FolderOpen, exact: true },
  ];
  const projectItems: NavItem[] = project ? [
    { label: 'Overview', path: `/projects/${project.id}/overview`, icon: LayoutDashboard },
    { label: 'Requirements', path: `/projects/${project.id}/requirements`, icon: FileText },
    { label: 'Artifacts', path: `/projects/${project.id}/artifacts`, icon: Layers },
    { label: 'Sprints', path: `/projects/${project.id}/sprints`, icon: Calendar },
    { label: 'Traceability', path: `/projects/${project.id}/traceability`, icon: GitBranch },
    { label: 'Exports', path: `/projects/${project.id}/export`, icon: Download },
    { label: 'Evaluations', path: `/projects/${project.id}/evaluations`, icon: BarChart3 },
    { label: 'Assistant', path: `/projects/${project.id}/assistant`, icon: MessageSquare },
  ] : [];
  const resourceItems: NavItem[] = [
    { label: 'Prompt library', path: '/prompts', icon: Code2 },
    { label: 'Case study', path: '/case-study', icon: BookOpen },
  ];
  const adminItems: NavItem[] = [
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Audit log', path: '/admin/audit-logs', icon: Shield },
    { label: 'Configuration', path: '/admin/configuration', icon: Settings2 },
  ];

  function section(label: string, items: NavItem[]) {
    return <section className="sidebar-section" aria-label={label}>
      {!collapsed && <h2 className="sidebar-section-label truncate" title={label}>{label}</h2>}
      <div className="space-y-0.5">{items.map((item) => <SidebarNavItem key={item.path} item={item} collapsed={collapsed} />)}</div>
    </section>;
  }

  return (
    <nav className={cn('workspace-sidebar flex shrink-0 flex-col h-full transition-[width] duration-200', collapsed ? 'w-[60px]' : 'w-[224px]')} aria-label="Main navigation">
      <div className={cn('sidebar-brand flex h-12 shrink-0 items-center', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
        <Link to="/dashboard" aria-label="DevPilot home" className="sidebar-wordmark">{collapsed ? 'DP' : 'DevPilot'}</Link>
        {!collapsed && <button type="button" onClick={onToggle} className="sidebar-icon-button hidden md:flex" aria-label="Collapse sidebar" title="Collapse sidebar"><PanelLeftClose size={16} strokeWidth={1.6} /></button>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-5 pb-4">
        <div className="space-y-0.5">{mainItems.map((item) => <SidebarNavItem key={item.path} item={item} collapsed={collapsed} />)}</div>
        {project && section(project.name, projectItems)}
        {section('Resources', resourceItems)}
        {user?.role === 'admin' && section('Administration', adminItems)}
      </div>

      <div className="sidebar-footer shrink-0 px-3 py-3 space-y-0.5">
        {collapsed && <button type="button" onClick={onToggle} className="sidebar-link is-collapsed hidden md:flex w-full" aria-label="Expand sidebar" title="Expand sidebar"><PanelLeftOpen size={17} strokeWidth={1.7} /></button>}
        <SidebarNavItem item={{ label: 'Preferences', path: '/settings/preferences', icon: SlidersHorizontal }} collapsed={collapsed} />
        <button type="button" onClick={logout} className={cn('sidebar-link w-full', collapsed && 'is-collapsed')} title={collapsed ? 'Sign out' : undefined} aria-label="Sign out"><LogOut size={17} strokeWidth={1.7} />{!collapsed && <span>Sign out</span>}</button>
        <NavLink to="/settings/profile" className={cn('sidebar-profile flex items-center gap-2.5 rounded-md mt-3 px-2 py-2', collapsed && 'justify-center px-0')} title={collapsed ? user?.name || 'Profile' : undefined} aria-label={collapsed ? 'Profile' : undefined}>
          {user && <Avatar name={user.name} size="sm" />}
          {!collapsed && <><div className="min-w-0 flex-1"><div className="sidebar-profile-name truncate text-xs font-medium">{user?.name}</div><div className="sidebar-profile-role text-[11px] mt-0.5">{user ? ROLE_LABELS[user.role] : ''}</div></div><Settings size={14} className="shrink-0 opacity-60" /></>}
        </NavLink>
      </div>
    </nav>
  );
}
