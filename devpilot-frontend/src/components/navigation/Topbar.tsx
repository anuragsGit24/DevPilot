import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { HelpCircle, Search, AlertTriangle, Sun, Moon, Menu } from 'lucide-react';
import { Avatar } from '@/components/ui/Misc';
import { SearchInput } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';

// ============================================================
// Topbar Component
// ============================================================

function buildBreadcrumbs(
  pathname: string,
  projectId: string | undefined,
  projects: { id: string; name: string }[],
): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: 'DevPilot', href: '/dashboard' }];
  const segments = pathname.split('/').filter(Boolean);

  const project = projects.find((item) => item.id === projectId);

  if (segments[0] === 'dashboard') crumbs.push({ label: 'Dashboard' });
  else if (segments[0] === 'projects') {
    crumbs.push({ label: 'Projects', href: '/projects' });
    if (project) {
      crumbs.push({ label: project.name, href: `/projects/${project.id}/overview` });
      if (segments[2]) {
        const map: Record<string, string> = {
          overview: 'Overview', requirements: 'Requirements', artifacts: 'Artifacts',
          sprints: 'Sprint Planning', evaluations: 'Evaluations', assistant: 'AI Assistant', traceability: 'Traceability', export: 'Export Hub',
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

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, isDemoMode } = useAuth();
  const { projects, activeProject } = useProjectData();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const projectParam = /^\/projects\/([^/]+)/.exec(location.pathname)?.[1];
  const projectId = projectParam === 'new' ? undefined : projectParam;
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const crumbs = buildBreadcrumbs(location.pathname, projectId, projects);
  const helpProjectId = projectId ?? (activeProject.id || projects[0]?.id);
  const helpLinks = [
    { label: 'Dashboard', description: 'Review project health and recent activity.', to: '/dashboard' },
    { label: 'Requirements', description: 'Ingest, review, and confirm requirements.', to: `/projects/${helpProjectId}/requirements` },
    { label: 'Artifacts', description: 'Generate and review stories, criteria, and tests.', to: `/projects/${helpProjectId}/artifacts` },
    { label: 'Sprint planning', description: 'Allocate stories and review sprint capacity.', to: `/projects/${helpProjectId}/sprints` },
    { label: 'Evaluations', description: 'Review benchmark runs and quality metrics.', to: `/projects/${helpProjectId}/evaluations` },
    { label: 'Prompt library', description: 'Browse prompt versions and test templates.', to: '/prompts' },
  ].filter((item) => helpProjectId || !item.to.includes('/projects/undefined'));
  const searchResults = [
    ...helpLinks,
    ...projects.map((project) => ({ label: project.name, description: 'Project workspace', to: `/projects/${project.id}/overview` })),
  ].filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <header
      className={cn(
        'h-12 shrink-0 bg-white border-b border-slate-200 flex items-center px-3 sm:px-6 gap-1 sm:gap-3 sticky top-0 z-40',
      )}
      aria-label="Top navigation bar"
    >
      <button type="button" onClick={onMenuToggle} aria-label="Open navigation" className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"><Menu size={20} /></button>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        <ol className="flex items-center gap-1.5 text-sm overflow-hidden whitespace-nowrap">
          {crumbs.map((crumb, i) => (
            <li key={i} className="hidden sm:flex items-center gap-1.5 last:flex min-w-0 shrink-0 last:shrink">
              {i > 0 && <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>}
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

      {/* Demo mode indicator */}
      {isDemoMode && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle size={13} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Demo Mode</span>
            {user && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </span>
            )}
        </div>
      )}

      {/* User avatar */}
      {user && (
        <Link to="/settings/profile" className="flex-shrink-0">
          <Avatar name={user.name} size="sm" />
        </Link>
      )}

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} title="Search workspace" description="Find projects and workspace pages.">
        <SearchInput aria-label="Search workspace" autoFocus placeholder="Search projects and pages…" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery('')} />
        <div className="mt-4 space-y-1">
          {searchResults.map((item) => <Link key={item.to} to={item.to} onClick={() => setSearchOpen(false)} className="block p-3 rounded-md hover:bg-slate-50">
            <span className="block text-sm font-medium text-slate-900">{item.label}</span><span className="block text-xs text-slate-500">{item.description}</span>
          </Link>)}
          {searchResults.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No results. Try a project name or page.</p>}
        </div>
      </Dialog>
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
