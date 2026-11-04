import { Link, Outlet, useParams } from 'react-router-dom';
import { Download, Share2, ArrowLeft } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export function ProjectLayout() {
  const { projectId } = useParams();
  const { projects } = useProjectData();
  const { toast } = useToast();
  const project = projects.find((item) => item.id === projectId);
  if (!project) return <EmptyState title="Project unavailable" description="This project does not exist or your account does not have access." action={<Link to="/projects"><Button variant="secondary">View projects</Button></Link>} />;

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ variant: 'success', title: 'Project link copied' });
    } catch {
      toast({ variant: 'error', title: 'Could not copy the link', description: 'Copy this page’s address from your browser.' });
    }
  }
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6">
      <div className="project-context shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/projects" aria-label="Back to projects" className="p-1 text-slate-500 hover:text-slate-900"><ArrowLeft size={16} /></Link>
          <span className="font-medium text-sm text-slate-900 truncate">{project.name}</span>
          <Badge variant="outline" size="xs">{project.status.replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Share2 size={14} />} onClick={() => void share()}>Copy link</Button>
          <Link to={`/projects/${project.id}/export`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-100"><Download size={14} />Export</Link>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
