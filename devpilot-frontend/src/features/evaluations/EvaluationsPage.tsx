import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart3, Play, RefreshCw } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, MetricCard } from '@/components/ui/Card';
import { ErrorState, LoadingSpinner } from '@/components/ui/Feedback';
import { formatDate } from '@/lib/date';
import { api, type ApiEvaluation } from '@/lib/api';

const percent = (score: number | undefined) => `${Math.round((score ?? 0) * 100)}%`;

export function EvaluationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject } = useProjectData();
  const { toast } = useToast();
  const [runs, setRuns] = useState<ApiEvaluation[]>([]);
  const [selected, setSelected] = useState<ApiEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const id = projectId || activeProject.id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setRuns(await api.listEvaluations(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load evaluation history.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // The callback performs an asynchronous API request; loading state is updated after the request starts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const execute = async () => {
    setRunning(true);
    try {
      const result = await api.runEvaluation(id);
      setRuns((previous) => [result, ...previous.filter((item) => item.id !== result.id)]);
      toast({ variant: 'success', title: 'Evaluation complete', description: result.summary || 'Quality scores were saved.' });
    } catch (err) {
      toast({ variant: 'error', title: 'Evaluation failed', description: err instanceof Error ? err.message : 'Could not run evaluation.' });
    } finally {
      setRunning(false);
    }
  };

  const latest = runs[0];
  if (!id) return <ErrorState title="No project selected" description="Open a project workspace to run its quality evaluation." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><BarChart3 size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quality Evaluations</h1>
            <p className="text-xs text-slate-500">Rubric scores from this project’s saved artifacts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void load()} disabled={loading}>Refresh</Button>
          <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={() => void execute()} loading={running} disabled={loading || !id}>Run evaluation</Button>
        </div>
      </div>

      {error && (error.includes('No requirements ingested') ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">This project has no ingested requirements yet.</p><p className="mt-1 text-xs">Upload a requirements document from the Requirements tab. The upload extracts and saves requirements in the backend before an evaluation can run.</p><Link className="mt-3 inline-block text-xs font-semibold text-blue-700 hover:underline" to={`/projects/${id}/requirements`}>Go to Requirements →</Link></div> : <ErrorState title="Could not load evaluations" description={error} onRetry={() => void load()} />)}
      {loading ? <div className="py-12 flex justify-center"><LoadingSpinner /></div> : <>
        {latest && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Overall" value={percent(latest.scores.overall)} color="green" sub="Weighted rubric score" />
          <MetricCard label="Completeness" value={percent(latest.scores.completeness)} color="blue" sub="Requirement coverage" />
          <MetricCard label="Groundedness" value={percent(latest.scores.groundedness)} color="purple" sub={`Method: ${String(latest.rubric_metadata?.grounding_method ?? '—').replaceAll('_', ' ')}`} />
          <MetricCard label="Consistency" value={percent(latest.scores.consistency)} color="amber" sub={`${latest.issues.length} identified issue(s)`} />
        </div>}

        <Card>
          <CardHeader><div><h2 className="text-base font-semibold text-slate-900">Evaluation history</h2><p className="text-xs text-slate-500">Select a saved run to inspect scores and findings.</p></div></CardHeader>
          <div className="overflow-x-auto"><table className="w-full data-table"><thead><tr><th>Run</th><th>Status</th><th>Completeness</th><th>Groundedness</th><th>Consistency</th><th>Overall</th><th>Date</th></tr></thead>
            <tbody>{runs.map((run) => <tr key={run.id} onClick={() => setSelected(run)} className="cursor-pointer hover:bg-slate-50">
              <td><span className="font-mono text-xs text-slate-700">{run.id.slice(0, 8)}</span><p className="text-2xs text-slate-400">{run.summary}</p></td>
              <td><Badge variant={run.status === 'completed' ? 'success' : 'default'}>{run.status}</Badge></td>
              <td>{percent(run.scores.completeness)}</td><td>{percent(run.scores.groundedness)}</td><td>{percent(run.scores.consistency)}</td><td className="font-semibold">{percent(run.scores.overall)}</td>
              <td>{formatDate(run.completed_at || run.created_at, 'dd MMM yyyy HH:mm')}</td>
            </tr>)}
              {runs.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No saved evaluations yet. Run an evaluation after adding requirements and generated artifacts.</td></tr>}
            </tbody></table></div>
        </Card>

        {selected && <Card><CardHeader><div className="flex-1"><h2 className="text-base font-semibold">Run details</h2><p className="text-xs text-slate-500">{selected.summary}</p></div><Button size="xs" variant="ghost" onClick={() => setSelected(null)}>Close</Button></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(['completeness', 'groundedness', 'consistency', 'overall'] as const).map((key) => <div key={key} className="rounded-lg border p-3"><p className="text-xs capitalize text-slate-500">{key}</p><p className="text-xl font-bold">{percent(selected.scores[key])}</p></div>)}</div>
            <p className="text-xs text-slate-500">Grounding method: {String(selected.rubric_metadata?.grounding_method ?? '—').replaceAll('_', ' ')} · {selected.metrics?.grounding?.claims_checked ?? 0} claims checked · {selected.metrics?.coverage?.requirements_covered ?? 0}/{selected.metrics?.coverage?.requirements_total ?? 0} requirements fully traced.</p>
            <div><h3 className="text-sm font-semibold mb-2">Findings ({selected.issues.length})</h3>{selected.issues.length ? <ul className="space-y-2">{selected.issues.map((issue, index) => <li key={`${issue.type}-${issue.key}-${index}`} className="rounded border border-amber-200 bg-amber-50 p-3 text-xs"><span className="font-semibold">{String(issue.type).replaceAll('_', ' ')}</span>{issue.key && <span className="ml-2 font-mono text-slate-500">{issue.key}</span>}<p className="mt-1 text-slate-600">{issue.detail}</p></li>)}</ul> : <p className="text-xs text-slate-500">No issues found.</p>}</div>
            <Link className="text-xs text-blue-600 hover:underline" to={`/projects/${id}/traceability`}>Open traceability matrix →</Link>
          </CardBody>
        </Card>}
      </>}
    </div>
  );
}
