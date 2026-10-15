import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProjectLayout } from '@/app/layouts/ProjectLayout';

// Auth Pages
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';

// Main Pages
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProjectsListPage } from '@/features/projects/ProjectsListPage';
import { NewProjectPage } from '@/features/projects/NewProjectPage';
import { ProjectOverviewPage } from '@/features/projects/ProjectOverviewPage';
import { RequirementsPage } from '@/features/requirements/RequirementsPage';
import { ArtifactsHubPage } from '@/features/artifacts/ArtifactsHubPage';
import { SprintPlanningPage } from '@/features/sprints/SprintPlanningPage';
import { EvaluationsPage } from '@/features/evaluations/EvaluationsPage';
import { AssistantPage } from '@/features/assistant/AssistantPage';
import { PromptLibraryPage } from '@/features/prompts/PromptLibraryPage';
import { PromptDetailPage } from '@/features/prompts/PromptDetailPage';
import { CaseStudyPage } from '@/features/case-study/CaseStudyPage';
import { UserManagementPage } from '@/features/admin/UserManagementPage';
import { AuditLogsPage } from '@/features/admin/AuditLogsPage';
import { ConfigurationPage } from '@/features/admin/ConfigurationPage';
import { ProfilePage } from '@/features/settings/ProfilePage';
import { PreferencesPage } from '@/features/settings/PreferencesPage';
import { Button } from '@/components/ui/Button';

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl mb-4">
        404
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        The requested path does not exist in this DevPilot enterprise prototype.
      </p>
      <Link to="/dashboard">
        <Button variant="primary">Return to Dashboard</Button>
      </Link>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Auth Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Authenticated Protected Routes */}
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Projects */}
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />

        {/* Contextual Project Sub-Workspaces */}
        <Route path="/projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<ProjectOverviewPage />} />
          <Route path="requirements" element={<RequirementsPage />} />
          <Route path="artifacts" element={<ArtifactsHubPage />} />
          <Route path="sprints" element={<SprintPlanningPage />} />
          <Route path="evaluations" element={<EvaluationsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
        </Route>

        {/* AI & Quality */}
        <Route path="/prompts" element={<PromptLibraryPage />} />
        <Route path="/prompts/:promptId" element={<PromptDetailPage />} />
        <Route path="/case-study" element={<CaseStudyPage />} />

        {/* Admin & System */}
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
        <Route path="/admin/configuration" element={<ConfigurationPage />} />
        <Route path="/admin/config" element={<Navigate to="/admin/configuration" replace />} />
        <Route path="/settings/profile" element={<ProfilePage />} />
        <Route path="/settings/preferences" element={<PreferencesPage />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
