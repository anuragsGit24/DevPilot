import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, MetricCard } from '@/components/ui/Card';
import { ErrorState, LoadingSpinner } from '@/components/ui/Feedback';
import { api, type ApiTraceabilityMatrix } from '@/lib/api';

export function TraceabilityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject, requirements, refreshGeneratedArtifacts } = useProjectData();
  const [matrix, setMatrix] = useState<ApiTraceabilityMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const id = projectId || activeProject.id;
  const requirementsByKey = useMemo(
    () => new Map(requirements.map((requirement) => [requirement.id, requirement])),
    [requirements],
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try { setMatrix(await api.getTraceabilityMatrix(id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load traceability matrix.'); }
    finally { setLoading(false); }
  }, [id]);

  // The callback performs an asynchronous API request; loading state is updated after the request starts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const generateMissingCoverage = useCallback(async () => {
    if (!id || !matrix) return;
    setGenerating(true);
    setError('');
    try {
      const uncoveredCriteriaIds = matrix.coverage
        .filter((row) => !row.covered_by.acceptance_criteria?.length)
        .map((row) => requirementsByKey.get(row.requirement_key)?.apiId)
        .filter((requirementId): requirementId is string => Boolean(requirementId));
      const uncoveredTestIds = matrix.coverage
        .filter((row) => !row.covered_by.test_case?.length)
        .map((row) => requirementsByKey.get(row.requirement_key)?.apiId)
        .filter((requirementId): requirementId is string => Boolean(requirementId));

      if (uncoveredCriteriaIds.length) {
        await api.generateAcceptanceCriteria(id, {
          title: `Acceptance Criteria — ${activeProject.name}`,
          requirement_ids: [...new Set(uncoveredCriteriaIds)],
        });
      }
      if (uncoveredTestIds.length) {
        await api.generateTestCases(id, {
          title: `Test Cases — ${activeProject.name}`,
          requirement_ids: [...new Set(uncoveredTestIds)],
        });
      }
      await refreshGeneratedArtifacts(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate missing coverage.');
    } finally {
      setGenerating(false);
    }
  }, [activeProject.name, id, load, matrix, refreshGeneratedArtifacts, requirementsByKey]);

  if (!id) return <ErrorState title="No project selected" description="Open a project workspace to view traceability." />;

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ArrowRightLeft size={23} /></div><div><h1 className="text-xl font-bold text-slate-900">Traceability Matrix</h1><p className="text-xs text-slate-500">Requirement coverage across stories, criteria, tests, and API endpoints</p></div></div>
      <div className="flex gap-2"><Link to={`/projects/${id}/evaluations`} className="inline-flex items-center rounded px-3 py-1.5 text-sm border border-slate-300 text-slate-700">Evaluations</Link><Button variant="primary" size="sm" onClick={() => void generateMissingCoverage()} loading={generating} disabled={!matrix || loading}>Generate missing criteria & tests</Button><Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void load()} loading={loading}>Refresh</Button></div>
    </div>
    {error && <ErrorState title="Traceability unavailable" description={error} onRetry={() => void load()} />}
    {loading ? <div className="py-12 flex justify-center"><LoadingSpinner /></div> : matrix && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label="Requirements" value={matrix.requirements_total} color="blue" sub="In this project" /><MetricCard label="Fully traced" value={`${matrix.requirements_covered} / ${matrix.requirements_total}`} color="green" sub="Story + criteria + test linked" /><MetricCard label="Gaps" value={matrix.gaps.length} color={matrix.gaps.length ? 'amber' : 'green'} sub={`Calculated ${new Date(matrix.computed_at).toLocaleString()}`} /></div>
      <Card><CardHeader><div><h2 className="text-base font-semibold">Requirement coverage</h2><p className="text-xs text-slate-500">Each row represents a source requirement and its linked generated artifacts.</p></div></CardHeader>
        <div className="overflow-x-auto"><table className="w-full data-table"><thead><tr><th>Source requirement</th><th>Stories</th><th>Acceptance criteria</th><th>Tests</th><th>API endpoints</th><th>Coverage</th></tr></thead><tbody>
           {matrix.coverage.map((row) => {
             const requirement = requirementsByKey.get(row.requirement_key);
             const title = row.requirement_title || requirement?.title;
             const description = row.requirement_description || requirement?.description;
             const source = row.source_document || requirement?.sourceDocumentName || requirement?.sourceSection || requirement?.sourceDocumentId;
             return <tr key={row.requirement_key}><td className="min-w-64"><Link to={`/projects/${id}/requirements?source=${encodeURIComponent(row.requirement_key)}`} className="font-mono text-xs font-semibold text-blue-700 hover:underline">{row.requirement_key} ↗</Link><p className="mt-1 text-xs font-medium text-slate-800">{title || 'Untitled requirement'}</p><p className="mt-1 max-w-xs text-2xs text-slate-500 line-clamp-2">{description || 'No description available.'}</p><p className="mt-1 text-2xs text-slate-400">Source: {source || 'Not recorded'}{typeof row.source_location?.page_count === 'number' ? ` · ${row.source_location.page_count} page(s)` : ''}</p></td>{(['user_story', 'acceptance_criteria', 'test_case', 'api_endpoint'] as const).map((kind) => <td key={kind}><div className="flex flex-wrap gap-1">{(row.covered_by[kind] ?? []).map((key) => <Badge key={key} variant="outline">{key}</Badge>)}{!row.covered_by[kind]?.length && <span className="text-slate-300">—</span>}</div></td>)}<td><Badge variant={row.fully_covered ? 'success' : 'warning'}>{Math.round(row.score * 100)}%{row.fully_covered ? ' · complete' : ' · partial'}</Badge></td></tr>;
           })}
          {!matrix.coverage.length && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No requirement coverage is available.</td></tr>}
        </tbody></table></div>
      </Card>
      <Card><CardHeader><div><h2 className="text-base font-semibold">Gap analysis</h2><p className="text-xs text-slate-500">Potential missing or invalid links found in latest artifact versions.</p></div></CardHeader><CardBody>
        {matrix.gaps.length ? <ul className="space-y-2">{matrix.gaps.map((gap, index) => <li key={`${gap.type}-${gap.key}-${index}`} className="rounded border border-amber-200 bg-amber-50 p-3 text-xs"><div className="flex gap-2 items-center"><Badge variant="warning">{gap.type.replaceAll('_', ' ')}</Badge>{gap.key && <span className="font-mono text-slate-500">{gap.key}</span>}</div><p className="mt-1 text-slate-700">{gap.detail}</p></li>)}</ul> : <p className="text-sm text-slate-500">No gaps found in the latest artifacts.</p>}
      </CardBody></Card>
    </>}
  </div>;
}
