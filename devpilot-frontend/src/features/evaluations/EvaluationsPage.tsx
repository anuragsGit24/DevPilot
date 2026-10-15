import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody, MetricCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Misc';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/date';
import type { EvaluationRun } from '@/types/domain';
import { BarChart3, Play } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export function EvaluationsPage() {
  const { evaluationRuns, runEvaluation, isProcessing } = useProjectData();
  const { projectId } = useParams<{ projectId: string }>();

  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [runName, setRunName] = useState('User Story Completeness Benchmark #4');
  const [dataset, setDataset] = useState('Barclays Synthetic Retail Suite v2.0');

  const handleExecuteRun = async () => {
    await runEvaluation(runName, dataset, projectId);
    setNewRunOpen(false);
  };

  const projectRuns = evaluationRuns.filter((run) => !projectId || run.projectId === projectId);
  const overallScore = (run: EvaluationRun) => run.metrics.overallScore ?? run.overallScore ?? Math.round(
    (run.metrics.accuracy + run.metrics.relevance + run.metrics.completeness) / 3,
  );
  const hallucinationRate = (run: EvaluationRun) => run.metrics.hallucinationRate ?? run.metrics.hallucinationRisk;
  const runDate = (run: EvaluationRun) => run.runDate ?? run.completedAt ?? run.createdAt ?? new Date().toISOString();

  const chartData = projectRuns.map((r) => {
    const name = r.name || `${r.artifactType.replaceAll('_', ' ')} evaluation`;
    return {
    name: name.length > 20 ? name.slice(0, 18) + '…' : name,
    Accuracy: r.metrics.accuracy,
    Relevance: r.metrics.relevance,
    Completeness: r.metrics.completeness,
    };
  });

  const latestRun = projectRuns[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Synthesis Evaluations (UC-09)</h1>
            <p className="text-xs text-slate-500">Continuous quantitative benchmarks for completeness, accuracy, relevance, and hallucinations</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Play size={14} />}
          onClick={() => setNewRunOpen(true)}
        >
          Execute New Benchmark
        </Button>
      </div>

      {/* Metrics Row from Latest Benchmark */}
      {latestRun && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Overall Benchmark Score"
            value={`${overallScore(latestRun)}%`}
            color="green"
            sub={`Run on ${formatDate(runDate(latestRun), 'dd MMM')}`}
          />
          <MetricCard
            label="Accuracy / Factual Alignment"
            value={`${latestRun.metrics.accuracy}%`}
            color="blue"
            sub="Target: ≥75%"
          />
          <MetricCard
            label="Semantic Relevance"
            value={`${latestRun.metrics.relevance}%`}
            color="purple"
            sub="Target: ≥80%"
          />
          <MetricCard
            label="Hallucination Rate"
            value={hallucinationRate(latestRun) === undefined ? 'N/A' : `${hallucinationRate(latestRun)}%`}
            color={(hallucinationRate(latestRun) ?? 100) < 5 ? 'green' : 'amber'}
            sub="Target: ≤5.0%"
          />
        </div>
      )}

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Comparative Metrics Breakdown</h2>
            <p className="text-xs text-slate-500">Accuracy, Relevance, and Completeness across recent test batches</p>
          </div>
        </CardHeader>
        <CardBody>
          {chartData.length > 0 ? <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c2340', borderColor: '#1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="Accuracy" fill="#0070ba" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Relevance" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completeness" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className="py-12 text-center text-sm text-slate-500">No evaluation runs are available for this project yet. Execute a benchmark to get started.</p>}
        </CardBody>
      </Card>

      {/* Evaluation Runs Table */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Evaluation History Runs</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Benchmark Run Name</th>
                <th>Evaluation Dataset</th>
                <th>Model</th>
                <th className="w-24">Items</th>
                <th className="w-24">Overall</th>
                <th className="w-24">Accuracy</th>
                <th className="w-24">Relevance</th>
                <th className="w-24">Hallucination</th>
                <th className="w-28 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {projectRuns.map((run) => {
                const sampleCount = run.totalItems ?? run.sampleCount ?? 0;
                const passedCount = run.passedItems ?? Math.round(sampleCount * overallScore(run) / 100);
                const rate = hallucinationRate(run);
                return (
                <tr
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedRun(run);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`View evaluation ${run.name || run.id}`}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <td>
                    <div>
                      <span className="font-semibold text-slate-900 text-xs">{run.name || `${run.artifactType.replaceAll('_', ' ')} evaluation`}</span>
                      <p className="text-2xs text-slate-400 font-mono mt-0.5">{run.id}</p>
                    </div>
                  </td>
                  <td className="text-xs text-slate-700">{run.datasetName || 'Baseline sample dataset'}</td>
                  <td>
                    <Badge variant="outline" size="xs" className="font-mono text-2xs">
                      {(run.modelName || 'Mock evaluator').split('-')[0]}
                    </Badge>
                  </td>
                  <td className="text-xs text-slate-600">
                    <span className="text-green-600 font-semibold">{passedCount}</span> / {sampleCount}
                  </td>
                  <td>
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                      {overallScore(run)}%
                    </span>
                  </td>
                  <td className="text-xs font-semibold text-blue-600">{run.metrics.accuracy}%</td>
                  <td className="text-xs font-semibold text-emerald-600">{run.metrics.relevance}%</td>
                  <td className="text-xs font-semibold text-amber-600">{rate === undefined ? 'N/A' : `${rate}%`}</td>
                  <td className="text-2xs text-slate-400 text-right font-mono">
                    {formatDate(runDate(run), 'dd MMM yyyy')}
                  </td>
                </tr>
                );
              })}
              {projectRuns.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-500">No evaluation history for this project yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Execute Run Dialog */}
      <Dialog
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
        title="Execute Synthetic Benchmark Run"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewRunOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={isProcessing.runEval}
              icon={<Play size={13} />}
              onClick={handleExecuteRun}
            >
              Start Benchmark Suite
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          <Input
            label="Evaluation Run Label"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Standardized Test Dataset</label>
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="form-input text-xs w-full"
            >
              <option value="Barclays Synthetic Retail Suite v2.0">Barclays Synthetic Retail Suite v2.0 (50 items)</option>
              <option value="Edge-Case Contradiction Dataset">Edge-Case Contradiction Dataset (30 items)</option>
              <option value="Regulatory Security Controls Benchmark">Regulatory Security Controls Benchmark (45 items)</option>
            </select>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-700">Evaluation Metrics Calculated:</span>
            <ul className="list-disc list-inside space-y-0.5 text-2xs text-slate-500">
              <li>Semantic overlap with ground truth BRD clauses</li>
              <li>Gherkin Given-When-Then parsing validation</li>
              <li>Hallucination detector penalty for invented parameters</li>
            </ul>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(selectedRun)}
        onClose={() => setSelectedRun(null)}
        title={selectedRun?.name || 'Evaluation details'}
        description={selectedRun ? `${selectedRun.datasetName || 'Baseline sample dataset'} · ${selectedRun.modelName || 'Mock evaluator'}` : undefined}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setSelectedRun(null)}>Close</Button>}
      >
        {selectedRun && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-500">{selectedRun.id}</span>
              <Badge variant={selectedRun.status === 'complete' ? 'success' : 'default'}>
                {selectedRun.status || 'illustrative sample'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['Accuracy', selectedRun.metrics.accuracy],
                ['Completeness', selectedRun.metrics.completeness],
                ['Relevance', selectedRun.metrics.relevance],
                ['Overall score', overallScore(selectedRun)],
              ].map(([label, score]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-900">{score}%</span>
                  </div>
                  <ProgressBar value={Number(score)} max={100} size="sm" />
                </div>
              ))}
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-semibold text-slate-800">Sample size:</span> {selectedRun.sampleCount ?? selectedRun.totalItems ?? 'Not recorded'}</p>
              <p><span className="font-semibold text-slate-800">Hallucination measure:</span> {hallucinationRate(selectedRun) === undefined ? 'Not recorded' : `${hallucinationRate(selectedRun)}%`}</p>
              {(selectedRun.reviewerFeedback || selectedRun.notes) && (
                <p className="pt-2"><span className="font-semibold text-slate-800">Review notes:</span> {selectedRun.reviewerFeedback || selectedRun.notes}</p>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
