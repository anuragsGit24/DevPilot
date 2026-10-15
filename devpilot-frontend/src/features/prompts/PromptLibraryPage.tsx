import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, PromptStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/date';
import {
  Code2, Plus, Sparkles, ExternalLink, ChevronRight,
  TrendingUp, CheckCircle2, History,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function PromptLibraryPage() {
  const { prompts, createPrompt } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [newPromptOpen, setNewPromptOpen] = useState(false);

  const normalizedSearch = search.toLowerCase();
  const filteredPrompts = prompts.filter((p) => {
    return (
      p.name.toLowerCase().includes(normalizedSearch) ||
      p.description.toLowerCase().includes(normalizedSearch) ||
      (p.targetArtifact ?? p.artifactType ?? '').toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Prompt Library (UC-08)</h1>
          <p className="text-sm text-slate-500">Versioned, benchmarked prompt templates powering DevPilot artifact synthesis</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setNewPromptOpen(true)}
        >
          New Prompt Template
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search prompt templates, variables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {prompts.length} Production Templates
        </div>
      </div>

      {/* Prompt Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPrompts.map((pmt) => {
          const activeVer = pmt.versions.find((v) => v.versionNumber === (pmt.activeVersion ?? 1)) ?? pmt.versions[0];
          const targetType = pmt.targetArtifact || pmt.artifactType || 'user_story';
          const varNames: string[] = pmt.variables
            ? (typeof pmt.variables[0] === 'string' ? (pmt.variables as string[]) : (pmt.variables as any[]).map((v) => v.name))
            : (activeVer?.variables ? (activeVer.variables as any[]).map((v) => (typeof v === 'string' ? v : v.name)) : ['input']);
          const score = activeVer?.benchmarkScore ?? activeVer?.performanceMetrics?.avgAccuracy;

          return (
            <Link
              key={pmt.id}
              to={`/prompts/${pmt.id}`}
              className="group block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
            >
              <Card className="h-full hover:shadow-card-hover hover:border-slate-300 transition-all flex flex-col justify-between">
                <CardBody className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Code2 size={20} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-2xs px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        v{pmt.activeVersion ?? activeVer?.versionNumber ?? 1}
                      </span>
                      {activeVer && <PromptStatusBadge status={activeVer.status} />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {pmt.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {pmt.description}
                    </p>
                  </div>

                  {/* Target Artifact & Variables */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-slate-400">Target Artifact:</span>
                      <span className="font-semibold text-slate-700 capitalize">{String(targetType || 'Artifact').replace(/_/g, ' ')}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {varNames.map((v) => (
                        <span key={v} className="text-2xs px-1.5 py-0.5 bg-slate-100 font-mono text-slate-600 rounded">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Benchmark Quality Score */}
                  {score !== undefined && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Historical Accuracy</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <TrendingUp size={13} /> {score}%
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-2xs text-slate-400 pt-2 border-t border-slate-100">
                    <span>{pmt.versions.length} versions tracked</span>
                    <span className="text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Open Playground <ChevronRight size={13} />
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* New Prompt Dialog */}
      <Dialog
        open={newPromptOpen}
        onClose={() => setNewPromptOpen(false)}
        title="Create System Prompt Template"
        size="md"
        footer={null}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            createPrompt({
              name: data.get('name') as string,
              description: data.get('description') as string,
              targetArtifact: data.get('target') as any,
              activeVersion: 1,
              variables: ['requirement', 'context'],
              versions: [
                {
                  versionNumber: 1,
                  status: 'draft',
                  templateText: 'You are an enterprise SDLC assistant. Generate artifacts based on {{requirement}}.',
                  benchmarkScore: 70,
                  createdAt: new Date().toISOString(),
                },
              ],
            });
            setNewPromptOpen(false);
          }}
          className="space-y-4"
        >
          <Input label="Prompt Name" name="name" required placeholder="e.g. Threat Modeling Generator" />
          <Textarea label="Objective & Description" name="description" required rows={2} placeholder="Explain what SDLC step this prompt guides..." />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Artifact Domain</label>
            <select name="target" className="form-input text-xs w-full">
              <option value="user_story">User Story</option>
              <option value="acceptance_criteria">Acceptance Criteria</option>
              <option value="test_case">Test Case</option>
              <option value="api_spec">OpenAPI Spec</option>
              <option value="architecture">Architecture</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setNewPromptOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Template</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
