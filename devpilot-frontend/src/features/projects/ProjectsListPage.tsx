import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, GitBranch, ArrowUpRight, Search } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { SearchInput, Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/date';

export function ProjectsListPage() {
  const { projects } = useProjectData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = projects.filter((project) => (status === 'all' || project.status === status) &&
    `${project.name} ${project.description} ${project.tags.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-slate-900">Projects</h1><p className="text-xs text-slate-500 mt-1">{projects.length} projects in your workspace</p></div><Link to="/projects/new" className="inline-flex gap-2 items-center px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-xs text-white font-medium"><Plus size={14} />New project</Link></div>
    <div className="flex flex-wrap gap-3 items-center"><div className="w-full sm:w-80"><SearchInput aria-label="Search projects" placeholder="Search projects…" value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch('')} /></div><div className="w-40"><Select aria-label="Project status" value={status} onChange={(event) => setStatus(event.target.value)} options={['all','active','on_hold','completed','archived'].map((value) => ({ value, label: value === 'all' ? 'All statuses' : value.replace('_',' ') }))} /></div></div>
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_100px_100px_110px_30px] gap-4 px-5 py-3 border-b border-slate-200 text-[11px] text-slate-500"><span>Project</span><span>Status</span><span>Requirements</span><span>Updated</span><span /></div>
      {filtered.map((project) => <Link key={project.id} to={`/projects/${project.id}/overview`} className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_100px_100px_110px_30px] items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
        <div className="flex gap-3 items-center min-w-0"><span className="p-2 border border-slate-200 rounded-md text-slate-500"><GitBranch size={16} /></span><div className="min-w-0"><h2 className="text-sm font-medium text-slate-900 truncate">{project.name}</h2><p className="text-xs text-slate-500 mt-1 truncate">{project.description || 'No description added'}</p>{project.tags.length > 0 && <p className="text-[11px] text-slate-500 mt-1 truncate">{project.tags.join(' · ')}</p>}</div></div>
        <span><Badge variant="outline" size="xs">{project.status.replace('_',' ')}</Badge></span><span className="hidden md:block text-xs text-slate-500 tabular-nums">{project.requirementCount}</span><span className="hidden md:block text-xs text-slate-500">{formatDate(project.updatedAt, 'dd MMM yyyy')}</span><ArrowUpRight size={14} className="hidden md:block text-slate-500" />
      </Link>)}
      {!filtered.length && <EmptyState icon={<Search size={22} />} title={projects.length ? 'No matching projects' : 'Create your first project'} description={projects.length ? 'Try another name or status.' : 'Start with your requirements and build from there.'} action={projects.length ? <Button variant="secondary" size="sm" onClick={() => {setSearch(''); setStatus('all');}}>Clear filters</Button> : <Link to="/projects/new"><Button size="sm">New project</Button></Link>} />}
    </div>
  </div>;
}
