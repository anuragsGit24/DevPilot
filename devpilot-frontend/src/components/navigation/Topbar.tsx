import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import { MOCK_PROJECTS } from '@/mocks/seed-data/project-retail-banking';
import { Bell, HelpCircle, ChevronDown, Search, AlertTriangle, Sun, Moon } from 'lucide-react';
import { Avatar } from '@/components/ui/Misc';
import { Dialog } from '@/components/ui/Dialog';
import type { UserRole } from '@/types/domain';
import { DEMO_USERS } from '@/mocks/seed-data/project-retail-banking';

// ============================================================
// Topbar Component
// ============================================================

function buildBreadcrumbs(pathname: string, projectId?: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: 'DevPilot', href: '/dashboard' }];
  const segments = pathname.split('/').filter(Boolean);

  const project = MOCK_PROJECTS.find((p) => p.id === projectId);

  if (segments[0] === 'dashboard') crumbs.push({ label: 'Dashboard' });
  else if (segments[0] === 'projects') {
    crumbs.push({ label: 'Projects', href: '/projects' });
    if (project) {
      crumbs.push({ label: project.name, href: `/projects/${project.id}/overview` });
      if (segments[2]) {
        const map: Record<string, string> = {
          overview: 'Overview', requirements: 'Requirements', artifacts: 'Artifacts',
          sprints: 'Sprint Planning', evaluations: 'Evaluations', assistant: 'AI Assistant',
        };
        if (map[segments[2]]) crumbs.push({ label: map[segments[2]] });
      }
    } else if (segments[1] === 'new') {
      crumbs.push({ label: 'New Project' });
    }
  } else if (segments[0] === 'prompts') {
    crumbs.push({ label: 'Prompt Library', href: '/prompts' });
    if (segments[1]) crumbs.push({ label: 'Prompt Detail' });
  } else if (segments[0] === 'case-study') {
    crumbs.push({ label: 'Case Study' });
  } else if (segments[0] === 'admin') {
    crumbs.push({ label: 'Administration' });
    const map: Record<string, string> = { users: 'Users', 'audit-logs': 'Audit Logs', configuration: 'Configuration' };
    if (segments[1] && map[segments[1]]) crumbs.push({ label: map[segments[1]] });
  } else if (segments[0] === 'settings') {
    crumbs.push({ label: 'Settings' });
    if (segments[1]) crumbs.push({ label: segments[1] === 'profile' ? 'Profile' : 'Preferences' });
  }

  return crumbs;
}

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export function Topbar({ sidebarCollapsed }: TopbarProps) {
  const { user, switchRole, isDemoMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const params = useParams();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const crumbs = buildBreadcrumbs(location.pathname, params.projectId);
  const notifications = [
    { id: 1, title: 'Sprint 2 velocity warning', desc: 'Allocation exceeds capacity by 13 pts', time: '5m ago', unread: true },
    { id: 2, title: 'Evaluation run complete', desc: 'User Stories eval scored 74%', time: '1h ago', unread: true },
    { id: 3, title: 'REQ-007 flagged for review', desc: 'Possible contradiction with REQ-014', time: '3h ago', unread: false },
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;
  const helpProjectId = params.projectId ?? MOCK_PROJECTS[0]?.id;
  const helpLinks = [
    { label: 'Dashboard', description: 'Review project health and recent activity.', to: '/dashboard' },
    { label: 'Requirements', description: 'Ingest, review, and confirm requirements.', to: `/projects/${helpProjectId}/requirements` },
    { label: 'Artifacts', description: 'Generate and review stories, criteria, and tests.', to: `/projects/${helpProjectId}/artifacts` },
    { label: 'Sprint planning', description: 'Allocate stories and review sprint capacity.', to: `/projects/${helpProjectId}/sprints` },
    { label: 'Evaluations', description: 'Review benchmark runs and quality metrics.', to: `/projects/${helpProjectId}/evaluations` },
    { label: 'Prompt library', description: 'Browse prompt versions and test templates.', to: '/prompts' },
  ];

  const demoRoles: { role: UserRole; label: string }[] = DEMO_USERS.filter((u) => u.active).map((u) => ({
    role: u.role,
    label: `${u.name} (${ROLE_LABELS[u.role]})`,
  }));

  return (
    <header
      className={cn(
        'h-[60px] bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-40',
      )}
      aria-label="Top navigation bar"
    >
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        <ol className="flex items-center gap-1.5 text-sm flex-wrap">
          {crumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-300" aria-hidden="true">/</span>}
              {crumb.href && i < crumbs.length - 1 ? (
                <Link to={crumb.href} className="text-slate-500 hover:text-slate-800 transition-colors truncate max-w-[150px]">
                  {crumb.label}
                </Link>
              ) : (
                <span className={cn('truncate max-w-[200px]', i === crumbs.length - 1 ? 'font-semibold text-slate-900' : 'text-slate-500')}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Search */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Search"
      >
        <Search size={16} />
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
          )}
        </button>
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-card-hover border border-slate-200 z-50 animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <button className="text-xs text-blue-600 hover:underline">Mark all read</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn('px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer', n.unread && 'bg-blue-50/40')}
                >
                  <div className="flex items-start gap-2">
                    {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-2" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 truncate">{n.desc}</p>
                      <p className="text-2xs text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
      </button>

      {/* Help */}
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Help and quick links"
        aria-haspopup="dialog"
        title="Help and quick links"
      >
        <HelpCircle size={16} />
      </button>

      {/* Demo mode + Role switcher */}
      {isDemoMode && (
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            aria-expanded={showRoleSwitcher}
          >
            <AlertTriangle size={13} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Demo Mode</span>
            {user && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </span>
            )}
            <ChevronDown size={12} className="text-amber-600" />
          </button>
          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-card-hover border border-slate-200 z-50 animate-fade-in overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 bg-amber-50">
                <p className="text-xs text-amber-700 font-medium">Switch Demo Role</p>
                <p className="text-2xs text-amber-600">Not security enforcement</p>
              </div>
              {demoRoles.map(({ role, label }) => (
                <button
                  key={role}
                  onClick={() => { switchRole(role); setShowRoleSwitcher(false); }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                    user?.role === role && 'bg-blue-50 text-blue-700 font-medium',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User avatar */}
      {user && (
        <Link to="/settings/profile" className="flex-shrink-0">
          <Avatar name={user.name} size="sm" />
        </Link>
      )}

      <Dialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="DevPilot help"
        description="Choose a workspace to continue, or use these shortcuts to find a feature."
        size="lg"
      >
        <nav aria-label="Help and feature shortcuts" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {helpLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setShowHelp(false)}
              className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
            </Link>
          ))}
        </nav>
      </Dialog>
    </header>
  );
}
