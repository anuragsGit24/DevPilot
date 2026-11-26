import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { Toaster } from '@/components/ui/Toaster';
import { Drawer } from '@/components/ui/Drawer';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { ErrorState, LoadingPage } from '@/components/ui/Feedback';
import { useAuth } from '@/app/providers/AuthProvider';
import { GlobalAssistantDrawer } from '@/components/assistant/GlobalAssistantDrawer';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const { workspaceLoading, workspaceError, retryWorkspace } = useProjectData();
  const { pathname } = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 font-sans text-slate-800">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="hidden md:flex"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></div>
      <Drawer open={menuPath === pathname} onClose={() => setMenuPath(null)} title="Navigation" side="left" size="sm">
        <Sidebar collapsed={false} onToggle={() => setMenuPath(null)} />
      </Drawer>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuToggle={() => setMenuPath(pathname)} />
        <main id="main-content" tabIndex={-1} className="workspace-main flex flex-col flex-1 min-w-0 overflow-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px] flex-1 min-h-0 flex flex-col">{workspaceLoading ? <LoadingPage /> : workspaceError ? <ErrorState title="Workspace unavailable" description={workspaceError} onRetry={retryWorkspace} /> : <Outlet />}</div>
        </main>
      </div>
      <Toaster />
      {!pathname.endsWith('/assistant') && <GlobalAssistantDrawer />}
    </div>
  );
}
