import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Plus, FileText, GitBranch, Check, Circle } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/date';

export function DashboardPage() {
  const { projects, activeProject, dashboard, requirements, userStories, testCases, activities, sprints } = useProjectData();
  const projectPath = `/projects/${activeProject.id}`;
  const reviewQueue = [
    ...requirements.filter((item) => item.status === 'in_review').map((item) => ({ id: item.id, title: item.title || item.id, type: 'Requirement', path: `${projectPath}/requirements` })),
    ...userStories.filter((item) => item.status === 'in_review').map((item) => ({ id: item.id, title: item.title, type: 'Story', path: `${projectPath}/artifacts` })),
  ];
  const steps = [
    { title: 'Add your requirements', description: 'Upload a document or enter requirements.', complete: requirements.length > 0, path: `${projectPath}/requirements` },
    { title: 'Build your delivery artifacts', description: 'Generate stories, criteria, and test cases.', complete: userStories.length > 0, path: `${projectPath}/artifacts` },
    { title: 'Plan a sprint', description: 'Turn the backlog into a delivery plan.', complete: sprints.length > 0, path: `${projectPath}/sprints` },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-slate-900">Overview</h1><p className="text-xs text-slate-500 mt-1">Your projects, reviews, and delivery activity.</p></div>
        <Link to="/projects/new" className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-medium text-white"><Plus size={14} />New project</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-lg bg-white divide-x divide-slate-200">
        {[
          { label: 'Requirements', value: requirements.length, detail: `${dashboard.confirmedRequirements} confirmed` },
          { label: 'User stories', value: userStories.length, detail: `${userStories.filter((item) => item.status === 'accepted').length} accepted` },
          { label: 'Test cases', value: testCases.length, detail: 'Linked to this project' },
          { label: 'Pending review', value: dashboard.pendingReviewCount, detail: activeProject.name || 'No project selected' },
        ].map((metric) => <div key={metric.label} className="px-5 py-4 min-w-0"><p className="text-xs text-slate-500">{metric.label}</p><p className="text-2xl font-medium text-slate-900 tabular-nums mt-2">{metric.value}</p><p className="text-[11px] text-slate-500 mt-1 truncate">{metric.detail}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-6">
        <section className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200"><h2 className="text-slate-900">Projects <span className="ml-2 text-xs text-slate-500 font-normal">{projects.length}</span></h2><Link to="/projects" className="text-xs text-slate-500 hover:text-slate-900">View all →</Link></div>
          {projects.slice(0, 6).map((project) => <Link key={project.id} to={`/projects/${project.id}/overview`} className="flex items-center gap-3 px-5 py-4 border-b last:border-0 border-slate-100 hover:bg-slate-50 group">
            <div className="p-2 rounded border border-slate-200 text-slate-500"><GitBranch size={16} /></div>
            <div className="min-w-0 flex-1"><span className="text-sm font-medium text-slate-900 block truncate">{project.name}</span><span className="text-xs text-slate-500 block truncate mt-1">{project.description || 'No description added'}</span></div>
            <Badge variant="outline" size="xs">{project.status.replace('_', ' ')}</Badge><ArrowUpRight size={14} className="text-slate-500 shrink-0" />
          </Link>)}
          {!projects.length && <div className="p-8"><p className="text-sm text-slate-700">No projects yet</p><p className="text-xs text-slate-500 mt-2">Create a project to bring your requirements and delivery work together.</p></div>}
        </section>

        <section className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200"><h2 className="text-slate-900">{requirements.length ? 'Review queue' : 'Getting started'}</h2><p className="text-xs text-slate-500 mt-1 truncate">{activeProject.name || 'Set up your first project'}</p></div>
          {!activeProject.id ? <div className="p-5"><Link to="/projects/new"><Button size="sm">Create a project</Button></Link></div> : !requirements.length ? <div className="divide-y divide-slate-100">{steps.map((step, index) => <Link key={step.title} to={step.path} className="flex gap-3 px-5 py-4 hover:bg-slate-50"><span className="w-6 h-6 shrink-0 rounded-full border border-slate-200 flex items-center justify-center text-xs text-slate-500">{step.complete ? <Check size={12} /> : index + 1}</span><div><p className="text-xs font-medium text-slate-900">{step.title}</p><p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.description}</p></div></Link>)}</div> : reviewQueue.length ? reviewQueue.slice(0, 5).map((item) => <Link key={item.id} to={item.path} className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50"><Circle size={14} className="text-amber-500 mt-1 shrink-0" /><div className="min-w-0"><p className="text-xs font-medium text-slate-900 truncate">{item.title}</p><p className="text-[11px] text-slate-500 mt-1">{item.id} · {item.type}</p></div></Link>) : <div className="px-5 py-8"><Check size={18} className="text-slate-500 mb-3" /><p className="text-sm text-slate-700">You’re up to date</p><p className="text-xs text-slate-500 mt-1">No requirements or stories are waiting for review.</p></div>}
        </section>
      </div>

      <section className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200"><h2 className="text-slate-900">Recent activity</h2></div>
        {activities.length ? activities.slice(0, 8).map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0"><FileText size={14} className="text-slate-500" /><span className="text-xs text-slate-700 flex-1 min-w-0 truncate">{item.userName} {item.action} <span className="text-slate-900">{item.entityTitle}</span></span><time className="text-[11px] text-slate-500">{formatDate(item.timestamp, 'dd MMM, HH:mm')}</time></div>) : <div className="px-5 py-8 text-xs text-slate-500">Project changes will appear here as work gets underway.</div>}
      </section>
      {activeProject.id && <Link to={`${projectPath}/requirements`} className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900">Open {activeProject.name}<ArrowRight size={13} /></Link>}
    </div>
  );
}
