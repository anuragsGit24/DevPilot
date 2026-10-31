import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw, Save } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ErrorState, LoadingSpinner } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Input';
import { api, type ApiPrompt, type ApiPromptRegression } from '@/lib/api';

const stateVariant = (state: ApiPrompt['lifecycle_state']) => state === 'active' ? 'success' : state === 'tested' ? 'info' : state === 'retired' ? 'outline' : 'default';

export function PromptDetailPage() {
  const { promptId } = useParams<{ promptId: string }>();
  const { activeProject } = useProjectData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState<ApiPrompt | null>(null);
  const [versionNumber, setVersionNumber] = useState<number>(1);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [regression, setRegression] = useState<ApiPromptRegression | null>(null);
  const canManage = user?.role === 'admin';
  const currentVersion = prompt?.versions.find((item) => item.version_number === versionNumber);

  const load = useCallback(async () => {
    if (!activeProject.id || !promptId) return;
    setLoading(true); setError('');
    try {
      const prompts = await api.listPrompts(activeProject.id);
      const found = prompts.find((item) => item.id === promptId) ?? null;
      setPrompt(found);
      if (!found) { setError('Prompt not found in the selected project.'); return; }
      const initial = found.versions.find((item) => item.version_number === found.active_version_number) ?? found.versions.at(-1);
      if (initial) {
        setVersionNumber(initial.version_number);
        setSystemPrompt(initial.system_prompt);
        setUserPrompt(initial.user_prompt);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load this prompt.'); }
    finally { setLoading(false); }
  }, [activeProject.id, promptId]);

  // The callback performs an asynchronous API request; loading state is updated after the request starts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const selectVersion = (number: number) => {
    setVersionNumber(number);
    const version = prompt?.versions.find((item) => item.version_number === number);
    if (version) { setSystemPrompt(version.system_prompt); setUserPrompt(version.user_prompt); }
  };

  const saveVersion = async () => {
    if (!prompt) return;
    setSaving(true);
    try {
      const version = await api.createPromptVersion(prompt.id, { system_prompt: systemPrompt, user_prompt: userPrompt });
      toast({ variant: 'success', title: 'Prompt version saved', description: `Version ${version.version_number} is stored.` });
      setRegression(null);
      await load();
      setVersionNumber(version.version_number);
      setSystemPrompt(version.system_prompt);
      setUserPrompt(version.user_prompt);
    } catch (err) { toast({ variant: 'error', title: 'Could not save version', description: err instanceof Error ? err.message : 'Version creation failed.' }); }
    finally { setSaving(false); }
  };

  const runRegression = async () => {
    if (!prompt) return;
    setAction('regression');
    try {
      const result = await api.runPromptRegression(prompt.id, versionNumber);
      setRegression(result);
      toast({ variant: result.is_pass ? 'success' : 'error', title: result.is_pass ? 'Regression passed' : 'Regression failed', description: 'The backend regression fixture results are shown below.' });
      await load();
    } catch (err) { toast({ variant: 'error', title: 'Regression could not run', description: err instanceof Error ? err.message : 'Prompt regression failed.' }); }
    finally { setAction(''); }
  };

  const activate = async () => {
    if (!prompt) return;
    setAction('activate');
    try { setPrompt(await api.activatePromptVersion(prompt.id, versionNumber)); toast({ variant: 'success', title: 'Prompt activated', description: `Version ${versionNumber} is active.` }); }
    catch (err) { toast({ variant: 'error', title: 'Could not activate prompt', description: err instanceof Error ? err.message : 'Activation failed.' }); }
    finally { setAction(''); }
  };

  const retire = async () => {
    if (!prompt) return;
    setAction('retire');
    try { setPrompt(await api.retirePrompt(prompt.id, versionNumber)); toast({ variant: 'success', title: 'Prompt retired' }); }
    catch (err) { toast({ variant: 'error', title: 'Could not retire prompt', description: err instanceof Error ? err.message : 'Retirement failed.' }); }
    finally { setAction(''); }
  };

  if (loading) return <div className="py-16 flex justify-center"><LoadingSpinner /></div>;
  if (error || !prompt) return <div className="space-y-4"><Link to="/prompts" className="inline-flex items-center gap-1 text-xs text-slate-500"><ArrowLeft size={14} /> Prompt Library</Link><ErrorState title="Prompt unavailable" description={error || 'Prompt not found.'} onRetry={() => void load()} /></div>;

  return <div className="space-y-6">
    <Link to="/prompts" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"><ArrowLeft size={14} /> Back to Prompt Library</Link>
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-xl font-bold text-slate-900">{prompt.name}</h1><Badge variant={stateVariant(prompt.lifecycle_state)}>{prompt.lifecycle_state}</Badge></div><p className="text-xs text-slate-500 mt-1">{prompt.description || prompt.prompt_key} · {prompt.artifact_type.replaceAll('_', ' ')}</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs text-slate-500">Version</label><select value={versionNumber} onChange={(event) => selectVersion(Number(event.target.value))} className="form-input text-xs py-1 px-2 rounded-lg font-mono">{prompt.versions.map((version) => <option key={version.id} value={version.version_number}>v{version.version_number}{prompt.active_version_number === version.version_number ? ' · active' : ''}</option>)}</select><Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()}>Refresh</Button></div></div>
    {!canManage && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">Prompt version changes, regression runs, and lifecycle actions require the admin prompt-management capability.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><div><h2 className="text-sm font-semibold">System prompt</h2><p className="text-2xs text-slate-500">Stored backend template text</p></div></CardHeader><CardBody><Textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={15} className="font-mono text-xs" disabled={!canManage || prompt.lifecycle_state === 'retired'} /></CardBody></Card>
      <Card><CardHeader><div><h2 className="text-sm font-semibold">User prompt template</h2><p className="text-2xs text-slate-500">Variables: {currentVersion?.variables?.map((name) => `{{${name}}}`).join(', ') || 'none detected'}</p></div></CardHeader><CardBody><Textarea value={userPrompt} onChange={(event) => setUserPrompt(event.target.value)} rows={15} className="font-mono text-xs" disabled={!canManage || prompt.lifecycle_state === 'retired'} /></CardBody></Card></div>
    <div className="flex flex-wrap gap-2"><Button onClick={() => void saveVersion()} loading={saving} disabled={!canManage || prompt.lifecycle_state === 'retired'} icon={<Save size={14} />}>Save as new version</Button><Button variant="secondary" onClick={() => void runRegression()} loading={action === 'regression'} disabled={!canManage || prompt.lifecycle_state === 'retired'} icon={<Play size={14} />}>Run regression fixtures</Button>{prompt.lifecycle_state === 'tested' && <Button variant="primary" onClick={() => void activate()} loading={action === 'activate'} disabled={!canManage}>Activate tested version</Button>}{(prompt.lifecycle_state === 'active' || prompt.lifecycle_state === 'tested') && <Button variant="danger" onClick={() => void retire()} loading={action === 'retire'} disabled={!canManage}>Retire prompt</Button>}</div>
    <p className="text-2xs text-slate-400">Regression uses the backend’s fixed deterministic fixture suite; it is not a free-form playground and does not represent a custom customer dataset.</p>
    {regression && <Card><CardHeader><div><h2 className="text-base font-semibold">Regression results</h2><p className="text-xs text-slate-500">{regression.is_pass ? 'All fixture checks passed.' : 'One or more fixture checks failed.'} · {new Date(regression.run_at).toLocaleString()}</p></div><Badge variant={regression.is_pass ? 'success' : 'danger'}>{regression.is_pass ? 'Passed' : 'Failed'}</Badge></CardHeader><CardBody><div className="overflow-x-auto"><table className="w-full data-table"><thead><tr><th>Fixture</th><th>Candidate schema</th><th>Coverage</th><th>Verdict</th><th>Details</th></tr></thead><tbody>{regression.results.map((result) => <tr key={result.test_id}><td className="font-mono">{result.test_id}</td><td>{result.candidate_ok ? 'Valid' : 'Invalid'}</td><td>{result.coverage_equal ? 'Preserved' : 'Changed'}</td><td><Badge variant={result.verdict === 'pass' ? 'success' : 'danger'}>{result.verdict}</Badge></td><td>{result.detail || '—'}</td></tr>)}</tbody></table></div></CardBody></Card>}
  </div>;
}
