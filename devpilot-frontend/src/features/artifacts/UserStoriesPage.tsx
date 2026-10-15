import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, ArtifactStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput, Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { formatDate } from '@/lib/date';
import type { UserStory, ArtifactStatus } from '@/types/domain';
import {
  Sparkles, CheckCircle2, XCircle, Edit3, Clock,
  History, ArrowRight, User, Target, Gift,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function UserStoriesPage() {
  const {
    userStories,
    requirements,
    updateUserStory,
    updateUserStoryStatus,
    generateUserStories,
    generateAcceptanceCriteria,
    isProcessing,
  } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);

  const filteredStories = userStories.filter((s) => {
    const searchLower = search.toLowerCase();
    const actionText = s.action || s.iWant || '';
    const benefitText = s.benefit || s.soThat || '';
    const roleText = s.userRole || s.asA || '';
    const matchesSearch =
      (s.title ?? '').toLowerCase().includes(searchLower) ||
      actionText.toLowerCase().includes(searchLower) ||
      benefitText.toLowerCase().includes(searchLower) ||
      roleText.toLowerCase().includes(searchLower) ||
      (s.id ?? '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRunGeneration = async () => {
    if (selectedReqIds.length === 0) return;
    await generateUserStories(selectedReqIds);
    setGenModalOpen(false);
    setSelectedReqIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search stories, personas, actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input text-xs py-1.5 px-3 rounded-lg"
          >
            <option value="all">All Statuses ({userStories.length})</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => setGenModalOpen(true)}
          >
            Generate from Requirements
          </Button>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStories.map((story) => {
          const parentReq = requirements.find((r) => r.id === story.requirementId);
          return (
            <Card key={story.id} className="hover:border-slate-300 transition-all flex flex-col justify-between">
              <CardBody className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-600">{story.id}</span>
                      <PriorityBadge priority={story.priority} />
                      <ArtifactStatusBadge status={story.status} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mt-1">{story.title}</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold flex-shrink-0">
                    {story.storyPoints} pts
                  </span>
                </div>

                {/* Persona - Action - Benefit Structure */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5 leading-relaxed">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-slate-500 uppercase text-2xs tracking-wide">As a</span>
                    <span className="font-medium text-slate-800">{story.userRole}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-slate-500 uppercase text-2xs tracking-wide">I want to</span>
                    <span className="text-slate-700">{story.action}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-slate-500 uppercase text-2xs tracking-wide">So that</span>
                    <span className="text-slate-700">{story.benefit}</span>
                  </div>
                </div>

                {/* Parent Requirement Tag */}
                {parentReq && (
                  <div className="text-2xs text-slate-400 flex items-center gap-1 font-mono">
                    <span>Source:</span>
                    <span className="text-slate-600 truncate max-w-[280px]">[{parentReq.id}] {parentReq.title}</span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-2xs text-slate-400">
                    <span className="font-mono">v{story.version}</span>
                    <span>•</span>
                    <span>{formatDate(story.updatedAt, 'dd MMM')}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedStory(story)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="View Details & Version History"
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => setEditingStory(story)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      title="Edit Story"
                    >
                      <Edit3 size={14} />
                    </button>
                    {story.status !== 'accepted' && (
                      <button
                        onClick={() => updateUserStoryStatus(story.id, 'accepted')}
                        className="p-1 text-slate-400 hover:text-green-600 rounded"
                        title="Accept Story"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    {story.status !== 'rejected' && (
                      <button
                        onClick={() => updateUserStoryStatus(story.id, 'rejected')}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Reject Story"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Story Detail & Version History Drawer */}
      <Drawer
        open={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        title={selectedStory ? `${selectedStory.id}: ${selectedStory.title}` : ''}
        size="lg"
        footer={
          selectedStory && (
            <div className="flex items-center justify-between w-full">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    updateUserStoryStatus(selectedStory.id, 'rejected');
                    setSelectedStory(null);
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    updateUserStoryStatus(selectedStory.id, 'accepted');
                    setSelectedStory(null);
                  }}
                >
                  Accept Story
                </Button>
              </div>
              <Button
                variant="secondary"
                size="xs"
                icon={<Sparkles size={14} />}
                onClick={async () => {
                  await generateAcceptanceCriteria([selectedStory.id]);
                  toast({ variant: 'success', title: 'Criteria Generated', description: 'Gherkin scenarios created.' });
                }}
              >
                Generate AC Scenarios
              </Button>
            </div>
          )
        }
      >
        {selectedStory && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <ArtifactStatusBadge status={selectedStory.status} />
              <PriorityBadge priority={selectedStory.priority} />
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
                {selectedStory.storyPoints} Story Points
              </span>
              <span className="text-xs text-slate-400 font-mono ml-auto">v{selectedStory.version}</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Persona Role</h4>
                <p className="text-xs text-slate-800 font-semibold">{selectedStory.userRole}</p>
                <p className="text-2xs text-slate-500">{selectedStory.personaDescription}</p>
              </div>
              <div>
                <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Action</h4>
                <p className="text-xs text-slate-800">{selectedStory.action}</p>
              </div>
              <div>
                <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Business Benefit</h4>
                <p className="text-xs text-slate-800">{selectedStory.benefit}</p>
              </div>
            </div>

            {/* Prompt Provenance */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                <Sparkles size={13} className="text-blue-600" />
                <span>AI Prompt Provenance</span>
              </div>
              <p className="text-2xs text-blue-800">Prompt: {selectedStory.promptId} (v{selectedStory.promptVersion})</p>
              <p className="text-2xs text-blue-700 font-mono">Engine: {selectedStory.modelName}</p>
            </div>

            {/* Version History */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Revision History</h4>
              {(!selectedStory.history || selectedStory.history.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Initial generation (Version 1). No previous modifications.</p>
              ) : (
                <div className="space-y-2">
                  {selectedStory.history.map((h, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>Version {h.version}</span>
                        <span className="text-slate-400">{formatDate(h.timestamp, 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{h.changeSummary}</p>
                      <p className="text-2xs text-slate-400 mt-0.5">Author: {h.authorId}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit Story Dialog */}
      <Dialog
        open={!!editingStory}
        onClose={() => setEditingStory(null)}
        title={`Edit User Story ${editingStory?.id}`}
        size="md"
        footer={
          editingStory && (
            <>
              <Button variant="secondary" onClick={() => setEditingStory(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateUserStory(editingStory.id, editingStory);
                  setEditingStory(null);
                }}
              >
                Save Story
              </Button>
            </>
          )
        }
      >
        {editingStory && (
          <div className="space-y-4">
            <Input
              label="Story Title"
              value={editingStory.title}
              onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
            />
            <Input
              label="User Role (Persona)"
              value={editingStory.userRole}
              onChange={(e) => setEditingStory({ ...editingStory, userRole: e.target.value })}
            />
            <Textarea
              label="Action"
              value={editingStory.action}
              onChange={(e) => setEditingStory({ ...editingStory, action: e.target.value })}
              rows={2}
            />
            <Textarea
              label="Benefit"
              value={editingStory.benefit}
              onChange={(e) => setEditingStory({ ...editingStory, benefit: e.target.value })}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Story Points</label>
                <select
                  value={editingStory.storyPoints}
                  onChange={(e) => setEditingStory({ ...editingStory, storyPoints: Number(e.target.value) })}
                  className="form-input text-xs w-full"
                >
                  {[1, 2, 3, 5, 8, 13, 21].map((pts) => (
                    <option key={pts} value={pts}>{pts} points</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={editingStory.priority}
                  onChange={(e) => setEditingStory({ ...editingStory, priority: e.target.value as any })}
                  className="form-input text-xs w-full"
                >
                  <option value="must">Must Have</option>
                  <option value="should">Should Have</option>
                  <option value="could">Could Have</option>
                  <option value="wont">Won't Have</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Generate Stories Modal */}
      <Dialog
        open={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        title="Synthesize User Stories (UC-02)"
        description="Select confirmed requirements to feed into the User Story prompt template."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={selectedReqIds.length === 0}
              loading={isProcessing.generateStories}
              onClick={handleRunGeneration}
              icon={<Sparkles size={14} />}
            >
              Generate Stories ({selectedReqIds.length} Selected)
            </Button>
          </>
        }
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {requirements.map((req) => (
            <label
              key={req.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedReqIds.includes(req.id) ? 'bg-blue-50/70 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                checked={selectedReqIds.includes(req.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedReqIds([...selectedReqIds, req.id]);
                  else setSelectedReqIds(selectedReqIds.filter((id) => id !== req.id));
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-600">{req.id}</span>
                  <span className="text-xs font-medium text-slate-900">{req.title}</span>
                  <PriorityBadge priority={req.priority} />
                </div>
                <p className="text-2xs text-slate-500 mt-1 line-clamp-2">{req.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
