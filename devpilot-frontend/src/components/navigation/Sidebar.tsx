import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import {
  LayoutDashboard, FolderOpen, FileText, Layers, Calendar,
  Code2, BarChart3, BookOpen, Users, Shield, Settings2, GitBranch,
  ChevronLeft, ChevronRight, Sparkles, LogOut, Settings,
  Moon,
} from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Avatar } from '@/components/ui/Misc';

// ============================================================
// Sidebar Component
// ============================================================

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, FolderOpen, FileText, Layers, Calendar,
  Code2, BarChart3, BookOpen, Users, Shield, Settings2, GitBranch,
};

interface SidebarNavItemProps {
  icon: string;
  label: string;
  path: string;
  collapsed: boolean;
  exact?: boolean;
}

function SidebarNavItem({ icon, label, path, collapsed, exact }: SidebarNavItemProps) {
  const Icon = ICONS[icon] ?? LayoutDashboard;
  return (
    <NavLink
      to={path}
      end={exact}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-navy-700 hover:text-white',
          collapsed && 'justify-center px-2',
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const { projects } = useProjectData();
  const params = useParams();

  // Determine active project for contextual nav
  const activeProjectId = params.projectId ?? projects[0]?.id;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  // Project-scoped nav items
  const projectNavItems = [
    { icon: 'FileText', label: 'Requirements', path: `/projects/${activeProjectId}/requirements` },
    { icon: 'Layers', label: 'Artifacts', path: `/projects/${activeProjectId}/artifacts` },
    { icon: 'Calendar', label: 'Sprints', path: `/projects/${activeProjectId}/sprints` },
    { icon: 'BarChart3', label: 'Evaluations', path: `/projects/${activeProjectId}/evaluations` },
    { icon: 'GitBranch', label: 'Traceability', path: `/projects/${activeProjectId}/traceability` },
    { icon: 'Sparkles', label: 'AI Assistant', path: `/projects/${activeProjectId}/assistant` },
  ];

  const isInProject = Boolean(params.projectId);

  return (
    <nav
      className={cn(
        'flex flex-col h-screen bg-navy-900 border-r border-navy-800 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={cn('flex items-center h-[60px] border-b border-navy-800 flex-shrink-0', collapsed ? 'justify-center px-2' : 'px-4 gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-white" size={18} />
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-base tracking-tight">DevPilot</span>
            <div className="text-navy-300 text-2xs font-medium">AI SDLC Co-Pilot</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-2 scrollbar-none">

        {/* Main */}
        <SidebarNavItem icon="LayoutDashboard" label="Dashboard" path="/dashboard" collapsed={collapsed} exact />
        <SidebarNavItem icon="FolderOpen" label="Projects" path="/projects" collapsed={collapsed} />

        {/* Project Context — only when inside a project */}
        {isInProject && (
          <>
            {!collapsed && (
              <div className="mt-4 mb-1 px-1">
                <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {activeProject?.name
                    ? activeProject.name.length > 22 ? activeProject.name.slice(0, 22) + '…' : activeProject.name
                    : 'Workspace'}
                </div>
              </div>
            )}
            {collapsed && <div className="border-t border-navy-800 my-2" />}
            {projectNavItems.map((item) => {
              const Icon = ICONS[item.icon] ?? Layers;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-navy-700 hover:text-white',
                      collapsed && 'justify-center px-2',
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {item.label === 'AI Assistant' ? <Sparkles size={18} /> : <Icon size={18} className="flex-shrink-0" />}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </>
        )}

        {/* AI & Quality */}
        <div className="border-t border-navy-800 my-3" />
        {!collapsed && <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">AI & Quality</p>}
        <SidebarNavItem icon="Code2" label="Prompt Library" path="/prompts" collapsed={collapsed} />
        <SidebarNavItem icon="BookOpen" label="Case Study" path="/case-study" collapsed={collapsed} />

        {/* Admin — only if admin role */}
        {user?.role === 'admin' && (
          <>
            <div className="border-t border-navy-800 my-3" />
            {!collapsed && <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">Administration</p>}
            <SidebarNavItem icon="Users" label="User Management" path="/admin/users" collapsed={collapsed} />
            <SidebarNavItem icon="Shield" label="Audit Logs" path="/admin/audit-logs" collapsed={collapsed} />
            <SidebarNavItem icon="Settings2" label="Configuration" path="/admin/configuration" collapsed={collapsed} />
          </>
        )}
      </div>

      {/* User section */}
      <div className="flex-shrink-0 border-t border-navy-800 p-2">
        {!collapsed ? (
          <div className="space-y-1">
            <NavLink
              to="/settings/profile"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-300 hover:bg-navy-700 hover:text-white text-sm transition-colors"
            >
              {user && <Avatar name={user.name} size="sm" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{user?.name}</div>
                <div className={cn('text-2xs px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5',
                  user ? ROLE_COLORS[user.role] : '')}>
                  {user ? ROLE_LABELS[user.role] : ''}
                </div>
              </div>
              <Settings size={14} className="flex-shrink-0 opacity-50" />
            </NavLink>
            <NavLink
              to="/settings/preferences"
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-300 hover:bg-navy-700 hover:text-white text-sm transition-colors',
                isActive && 'bg-navy-700 text-white',
              )}
            >
              <Moon size={15} />
              <span>Preferences</span>
            </NavLink>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-400 hover:bg-red-900/30 hover:text-red-300 text-sm transition-colors"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            {user && (
              <NavLink to="/settings/profile" title="Settings">
                <Avatar name={user.name} size="sm" />
              </NavLink>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[72px] w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </nav>
  );
}
