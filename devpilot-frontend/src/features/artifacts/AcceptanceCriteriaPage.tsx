import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, ArtifactStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput, Textarea, Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { CodeBlock } from '@/components/ui/Misc';
import type { AcceptanceCriteria } from '@/types/domain';
import { CheckCircle2, XCircle, Edit3, Sparkles, FileCode, Check } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function AcceptanceCriteriaPage() {
  const {
    acceptanceCriteria,
    userStories,
    updateAcceptanceCriteria,
    updateAcceptanceCriteriaStatus,
    generateTestCases,
    generateAcceptanceCriteria,
    isProcessing,
  } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [editingCriteria, setEditingCriteria] = useState<AcceptanceCriteria | null>(null);

  const filteredCriteria = acceptanceCriteria.filter((c) => {
    const searchLower = search.toLowerCase();
    const titleText = c.scenarioName || c.title || '';
    const gherkinText = c.gherkin || '';
    return (
      titleText.toLowerCase().includes(searchLower) ||
      gherkinText.toLowerCase().includes(searchLower) ||
      (c.id ?? '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search scenarios or Gherkin steps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            loading={isProcessing.generateCriteria}
            onClick={async () => {
              const storyIds = userStories.slice(0, 2).map((s) => s.id);
              await generateAcceptanceCriteria(storyIds);
            }}
          >
            Generate from User Stories
          </Button>
        </div>
      </div>

      {/* Criteria Scenarios */}
      <div className="space-y-4">
        {filteredCriteria.map((c) => {
          const parentStory = userStories.find((s) => s.id === c.userStoryId);
          return (
            <Card key={c.id}>
              <CardHeader
                action={
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingCriteria(c)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                      title="Edit Gherkin Scenario"
                    >
                      <Edit3 size={15} />
                    </button>
                    {c.status !== 'accepted' && (
                      <button
                        onClick={() => updateAcceptanceCriteriaStatus(c.id, 'accepted')}
                        className="p-1.5 text-slate-400 hover:text-green-600 rounded"
                        title="Accept Scenario"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    {c.status !== 'rejected' && (
                      <button
                        onClick={() => updateAcceptanceCriteriaStatus(c.id, 'rejected')}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        title="Reject Scenario"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileCode size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-600">{c.id}</span>
                      <ArtifactStatusBadge status={c.status} />
                      <span className="text-2xs text-slate-400 font-mono">v{c.version}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{c.scenarioName || c.title || 'Scenario'}</h3>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {parentStory && (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Linked Story:</span>
                    <span className="font-mono text-blue-600">[{parentStory.id}]</span>
                    <span className="truncate">{parentStory.title}</span>
                  </div>
                )}

                {/* Gherkin Viewer */}
                <CodeBlock
                  code={c.gherkin || '# No Gherkin specification'}
                  language="gherkin"
                  title="Scenario Specification"
                />

                <div className="flex items-center justify-between pt-2 text-2xs text-slate-400">
                  <span>Prompt: {c.promptId} (v{c.promptVersion})</span>
                  <Button
                    variant="outline"
                    size="xs"
                    icon={<Sparkles size={12} />}
                    onClick={async () => {
                      await generateTestCases([c.id]);
                    }}
                  >
                    Synthesize Test Case
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Edit Criteria Dialog */}
      <Dialog
        open={!!editingCriteria}
        onClose={() => setEditingCriteria(null)}
        title={`Edit Criteria ${editingCriteria?.id}`}
        size="lg"
        footer={
          editingCriteria && (
            <>
              <Button variant="secondary" onClick={() => setEditingCriteria(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateAcceptanceCriteria(editingCriteria.id, editingCriteria);
                  setEditingCriteria(null);
                }}
              >
                Save Criteria
              </Button>
            </>
          )
        }
      >
        {editingCriteria && (
          <div className="space-y-4">
            <Input
              label="Scenario Name"
              value={editingCriteria.scenarioName}
              onChange={(e) => setEditingCriteria({ ...editingCriteria, scenarioName: e.target.value })}
            />
            <Textarea
              label="Gherkin Definition (Feature / Scenario / Given / When / Then)"
              value={editingCriteria.gherkin}
              onChange={(e) => setEditingCriteria({ ...editingCriteria, gherkin: e.target.value })}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}
