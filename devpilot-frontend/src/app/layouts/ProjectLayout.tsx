import React, { useState } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { cn, scoreBgColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
   FileText, Layers, Calendar, BarChart3, GitBranch,
   Sparkles, Download, ChevronRight, CheckCircle2,
  Share2, ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, userStories, requirements, testCases } = useProjectData();
  const { toast } = useToast();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json' | 'csv' | 'jira'>('markdown');

  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-card">
          <h2 className="text-lg font-bold text-slate-800">Project Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">Please select an existing project from the projects list.</p>
          <div className="mt-4">
            <Link to="/projects">
              <Button variant="primary" size="sm">Go to Projects</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', path: `/projects/${project.id}/overview`, icon: Layers },
    { id: 'requirements', label: 'Requirements', path: `/projects/${project.id}/requirements`, count: project.requirementCount, icon: FileText },
    { id: 'artifacts', label: 'Artifacts', path: `/projects/${project.id}/artifacts`, count: project.artifactCount, icon: Layers },
    { id: 'sprints', label: 'Sprint Planning', path: `/projects/${project.id}/sprints`, icon: Calendar },
    { id: 'evaluations', label: 'Evaluations', path: `/projects/${project.id}/evaluations`, icon: BarChart3 },
    { id: 'traceability', label: 'Traceability', path: `/projects/${project.id}/traceability`, icon: GitBranch },
    { id: 'assistant', label: 'AI Assistant', path: `/projects/${project.id}/assistant`, icon: Sparkles },
  ];

  const handleExport = () => {
    let content = '';
    let mime = 'text/plain';
    let ext = 'txt';

    if (exportFormat === 'json') {
      content = JSON.stringify({ project, requirements, userStories, testCases }, null, 2);
      mime = 'application/json';
      ext = 'json';
    } else if (exportFormat === 'markdown') {
      content = `# ${project.name}\n\n${project.description}\n\n## Requirements (${requirements.length})\n` +
        requirements.map((r) => `- **${r.id}**: ${r.title} [Priority: ${r.priority}, Status: ${r.status}]`).join('\n') +
        `\n\n## User Stories (${userStories.length})\n` +
        userStories.map((s) => `### ${s.id}: ${s.title}\nAs a ${s.userRole || s.asA || 'User'}, I want to ${s.action || s.iWant || ''} so that ${s.benefit || s.soThat || ''}.\nPoints: ${s.storyPoints ?? 0}\n`).join('\n');
      mime = 'text/markdown';
      ext = 'md';
    } else if (exportFormat === 'csv') {
      content = 'ID,Type,Title,Status,Priority\n' +
        requirements.map((r) => `"${r.id}","Requirement","${r.title}","${r.status}","${r.priority}"`).join('\n') + '\n' +
        userStories.map((s) => `"${s.id}","User Story","${s.title}","${s.status}","${s.priority}"`).join('\n');
      mime = 'text/csv';
      ext = 'csv';
    } else if (exportFormat === 'jira') {
      content = JSON.stringify({
        issues: userStories.map((s) => ({
          fields: {
            project: { key: 'RET' },
            summary: s.title,
            description: `As a ${s.userRole || s.asA || 'User'}, I want to ${s.action || s.iWant || ''} so that ${s.benefit || s.soThat || ''}`,
            issuetype: { name: 'Story' },
            customfield_10016: s.storyPoints ?? 0,
          },
        })),
      }, null, 2);
      mime = 'application/json';
      ext = 'jira.json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.name || 'project').toLowerCase().replace(/\s+/g, '_')}_export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
    toast({ variant: 'success', title: 'Export Generated', description: `Downloaded ${a.download}` });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link to="/projects" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                <ArrowLeft size={13} /> Projects
              </Link>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="font-semibold text-slate-700">{project.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
              <Badge variant={project.status === 'active' ? 'success' : 'default'} dot>
                {project.status.toUpperCase()}
              </Badge>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold border', scoreBgColor(project.qualityScore))}>
                Quality Score: {project.qualityScore}%
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-3xl">{project.description}</p>
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {project.tags.map((tag) => (
                <span key={tag} className="text-2xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => setExportModalOpen(true)}
            >
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Share2 size={14} />}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ variant: 'info', title: 'Link copied to clipboard' });
              }}
            >
              Share
            </Button>
          </div>
        </div>

        {/* Project Sub-navigation Tabs */}
        <div className="mt-6 -mb-6 border-t border-slate-100 pt-1 flex items-center overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
                  )
                }
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {tab.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Child Route Content */}
      <Outlet />

      {/* Export Modal (UC-12) */}
      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Project Artifacts"
        description="Select format to export requirements, user stories, acceptance criteria, and test cases."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExportModalOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={<Download size={14} />} onClick={handleExport}>
              Download Package
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
            Target Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'markdown', label: 'Markdown Document', desc: 'Formatted .md ready for Wiki/Notion/PRD' },
              { id: 'json', label: 'Full JSON Bundle', desc: 'Normalized data model for automated pipelines' },
              { id: 'csv', label: 'CSV Spreadsheet', desc: 'Tabular list for Excel, PM review, or Google Sheets' },
              { id: 'jira', label: 'Jira Import JSON', desc: 'Pre-formatted payload for Jira REST issue import' },
            ].map((fmt) => (
              <div
                key={fmt.id}
                onClick={() => setExportFormat(fmt.id as 'markdown' | 'json' | 'csv' | 'jira')}
                className={cn(
                  'p-3.5 rounded-lg border text-left cursor-pointer transition-all',
                  exportFormat === fmt.id
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">{fmt.label}</span>
                  {exportFormat === fmt.id && <CheckCircle2 size={15} className="text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 leading-normal">{fmt.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-700">Export Scope:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>{requirements.length} Source & Functional Requirements</li>
              <li>{userStories.length} User Stories (Persona, Action, Benefit, Points)</li>
              <li>{testCases.length} Executable Test Cases</li>
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
