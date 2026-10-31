import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Code2, RefreshCw, Sparkles } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ErrorState, LoadingSpinner } from '@/components/ui/Feedback';
import { SearchInput } from '@/components/ui/Input';
import { api, type ApiPrompt } from '@/lib/api';

const stateVariant = (state: ApiPrompt['lifecycle_state']) => state === 'active' ? 'success' : state === 'tested' ? 'info' : state === 'retired' ? 'outline' : 'default';

export function PromptLibraryPage() {
  const { activeProject } = useProjectData();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<ApiPrompt[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!activeProject.id) { setPrompts([]); setLoading(false); return; }
    setLoading(true); setError('');
    try { setPrompts(await api.listPrompts(activeProject.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load prompts.'); }
    finally { setLoading(false); }
  }, [activeProject.id]);
  // The callback performs an asynchronous API request; loading state is updated after the request starts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      setPrompts(await api.seedPrompts(activeProject.id));
      toast({ variant: 'success', title: 'Canonical prompts ready', description: 'Prompts were loaded from the backend templates.' });
    } catch (err) { toast({ variant: 'error', title: 'Could not seed prompts', description: err instanceof Error ? err.message : 'Prompt seeding failed.' }); }
    finally { setSeeding(false); }
  };

  const filtered = prompts.filter((prompt) => `${prompt.name} ${prompt.description ?? ''} ${prompt.artifact_type}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Prompt Library</h1><p className="text-sm text-slate-500">Backend-managed prompt versions, regressions, and lifecycle states · {activeProject.name || 'No project selected'}</p></div>
      <div className="flex gap-2"><Button variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void load()} loading={loading}>Refresh</Button><Button variant="primary" icon={<Sparkles size={15} />} onClick={() => void seed()} loading={seeding} disabled={!activeProject.id}>Seed canonical prompts</Button></div>
    </div>
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"><div className="w-full sm:w-80"><SearchInput placeholder="Search prompts..." value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch('')} /></div><span className="text-xs text-slate-500">{prompts.length} backend prompt(s)</span></div>
    {error && <ErrorState title="Could not load prompts" description={error} onRetry={() => void load()} />}
    {loading ? <div className="py-12 flex justify-center"><LoadingSpinner /></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map((prompt) => {
      const activeVersion = prompt.versions.find((version) => version.version_number === prompt.active_version_number) ?? prompt.versions.at(-1);
      return <Link key={prompt.id} to={`/prompts/${prompt.id}`} className="group block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"><Card className="h-full hover:shadow-card-hover hover:border-slate-300 transition-all"><CardBody className="space-y-4">
        <div className="flex items-start justify-between"><div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Code2 size={20} /></div><Badge variant={stateVariant(prompt.lifecycle_state)}>{prompt.lifecycle_state}</Badge></div>
        <div><h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-600">{prompt.name}</h2><p className="text-xs text-slate-500 line-clamp-2 mt-1">{prompt.description || 'No description provided.'}</p></div>
        <div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-slate-400">Artifact</span><span className="font-medium capitalize">{prompt.artifact_type.replaceAll('_', ' ')}</span></div><div className="flex justify-between"><span className="text-slate-400">Active version</span><span>{prompt.active_version_number ? `v${prompt.active_version_number}` : 'None'}</span></div><div className="flex justify-between"><span className="text-slate-400">Versions</span><span>{prompt.versions.length}{activeVersion ? ` · latest v${activeVersion.version_number}` : ''}</span></div></div>
        <p className="border-t pt-3 text-2xs text-slate-400 font-mono">{prompt.prompt_key}</p>
      </CardBody></Card></Link>;
    })}{!filtered.length && <div className="col-span-full bg-white border border-dashed rounded-xl"><div className="py-12 text-center"><p className="text-sm text-slate-600">{prompts.length ? 'No prompts match your search.' : 'No prompts have been seeded for this project.'}</p>{!prompts.length && <p className="text-xs text-slate-400 mt-1">Seed canonical prompts to begin versioning and regression tests.</p>}</div></div>}</div>}
  </div>;
}
