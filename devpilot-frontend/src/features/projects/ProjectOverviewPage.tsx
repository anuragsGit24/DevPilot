import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, FileText, Layers, Calendar, GitBranch } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { formatDate } from '@/lib/date';

export function ProjectOverviewPage() {
  const { projectId } = useParams();
  const { projects, requirements, userStories, testCases, sprints, activities } = useProjectData();
  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;
  const modules = [
    { name: 'Requirements', detail: 'Source requirements and review status', value: requirements.length, path: 'requirements', icon: FileText },
    { name: 'Artifacts', detail: 'User stories, acceptance criteria, and tests', value: `${userStories.length} stories · ${testCases.length} tests`, path: 'artifacts', icon: Layers },
    { name: 'Sprint planning', detail: 'Backlog allocation and team capacity', value: `${sprints.length} sprints`, path: 'sprints', icon: Calendar },
    { name: 'Traceability', detail: 'Links between source requirements and delivery', value: 'View coverage', path: 'traceability', icon: GitBranch },
  ];
  return <div className="space-y-6">
    <div><h1 className="text-slate-900">Project overview</h1><p className="mt-2 text-sm text-slate-500 max-w-3xl">{project.description || 'No description added.'}</p></div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
      <section className="border border-slate-200 rounded-lg bg-white overflow-hidden"><div className="px-5 py-4 border-b border-slate-200"><h2 className="text-slate-900">Project work</h2></div>{modules.map((module) => <Link key={module.path} to={`/projects/${project.id}/${module.path}`} className="flex flex-wrap items-center gap-3 px-5 py-4 border-b last:border-0 border-slate-100 hover:bg-slate-50"><module.icon size={17} className="text-slate-500" /><div className="flex-1 min-w-0"><h3 className="text-sm font-medium text-slate-900">{module.name}</h3><p className="text-xs text-slate-500 mt-1">{module.detail}</p></div><span className="text-xs text-slate-500">{module.value}</span><ArrowUpRight size={14} className="text-slate-500" /></Link>)}</section>
      <section className="border border-slate-200 rounded-lg bg-white p-5"><h2 className="text-slate-900 mb-5">Details</h2><dl className="text-xs space-y-4"><div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="text-slate-700 capitalize">{project.status.replace('_',' ')}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Created</dt><dd className="text-slate-700">{formatDate(project.createdAt, 'dd MMM yyyy')}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Updated</dt><dd className="text-slate-700">{formatDate(project.updatedAt, 'dd MMM yyyy')}</dd></div><div><dt className="text-slate-500 mb-2">Tags</dt><dd className="text-slate-700">{project.tags.join(' · ') || 'No tags'}</dd></div></dl></section>
    </div>
    <section className="border border-slate-200 rounded-lg bg-white overflow-hidden"><div className="px-5 py-4 border-b border-slate-200"><h2 className="text-slate-900">Recent activity</h2></div>{activities.length ? activities.slice(0,5).map((item) => <div key={item.id} className="px-5 py-3 border-b last:border-0 border-slate-100 text-xs text-slate-500">{item.entityTitle || item.action}<time className="ml-3">{formatDate(item.timestamp,'dd MMM, HH:mm')}</time></div>) : <p className="px-5 py-6 text-xs text-slate-500">No activity recorded yet.</p>}</section>
  </div>;
}
