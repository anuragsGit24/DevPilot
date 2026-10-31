import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { Toaster } from '@/components/ui/Toaster';
import { useAuth } from '@/app/providers/AuthProvider';
import { GlobalAssistantDrawer } from '@/components/assistant/GlobalAssistantDrawer';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar sidebarCollapsed={collapsed} />

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>

      {/* Global Notification Toast Container */}
      <Toaster />

      {/* Global Contextual AI Assistant Drawer (Engineer 5) */}
      <GlobalAssistantDrawer />
    </div>
  );
}
