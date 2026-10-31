import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, RequirementStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput, Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { formatBytes } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import type { Requirement, RequirementCategory, RequirementPriority } from '@/types/domain';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Edit3, Sparkles, Filter, Plus, Eye,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { api } from '@/lib/api';

export function RequirementsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    requirements,
    documents,
    refreshBackendRequirements,
    updateRequirementStatus,
    updateRequirement,
    addRequirement,
    generateUserStories,
  } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [newReqOpen, setNewReqOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<{ filename: string; count: number } | null>(null);

  useEffect(() => {
    const sourceKey = searchParams.get('source');
    if (!sourceKey) return;
    const requirement = requirements.find((item) => item.id === sourceKey);
    if (!requirement) return;
    // Resolve a deep link once the backend requirements have loaded into project state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedReq(requirement);
    setSearchParams({}, { replace: true });
  }, [requirements, searchParams, setSearchParams]);

  // Filter requirements
  const filteredReqs = requirements.filter((r) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (r.title ?? '').toLowerCase().includes(searchLower) ||
      (r.description ?? '').toLowerCase().includes(searchLower) ||
      r.id.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate contradictions count
  const contradictionCount = requirements.reduce((acc, r) => acc + (r.contradictions?.length ?? 0), 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (!projectId) throw new Error('Select a project before uploading requirements.');
      const result = await api.uploadRequirements(projectId, file);
      await refreshBackendRequirements(projectId);
      setLastUpload({ filename: result.filename, count: result.requirements_created });
      toast({
        variant: 'success',
        title: 'Requirements ingested',
        description: `${result.requirements_created} requirement(s) extracted and saved for evaluation.`,
      });
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Requirement ingestion failed',
        description: error instanceof Error ? error.message : 'Could not upload this requirements document.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contradiction Alert Banner */}
      {contradictionCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Specification Conflict Detected ({contradictionCount} items)
            </h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Automated NLP semantic checks flagged potential contradictions between regulatory requirements.
              For example, <span className="font-mono font-semibold">REQ-007</span> specifies a 3-attempt biometric lockout while{' '}
              <span className="font-mono font-semibold">REQ-014</span> allows unlimited hardware fallbacks. Review before generating test cases.
            </p>
          </div>
        </div>
      )}

      {/* Top Document Upload Bar & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <Card className="lg:col-span-2">
          <CardHeader
            action={
              <Button
                variant="primary"
                size="xs"
                icon={<Plus size={14} />}
                onClick={() => setNewReqOpen(true)}
              >
                Add Manual Requirement
              </Button>
            }
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">BRD / PRD Document Ingestion (UC-01)</h2>
              <p className="text-xs text-slate-500">Upload business specifications to trigger AI section parsing</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="req-brd-upload"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="req-brd-upload" className="cursor-pointer block">
                  <Upload size={20} className="mx-auto text-blue-600 mb-1" />
                  <span className="text-xs font-semibold text-slate-800">
                    {uploading ? 'Ingesting document...' : 'Click to upload BRD / PRD (PDF, DOCX, MD)'}
                  </span>
                  <p className="text-2xs text-slate-400 mt-0.5">Automated table parsing and clause chunking</p>
                </label>
              </div>

            </div>

            {lastUpload && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                Ingested <span className="font-semibold">{lastUpload.filename}</span> · {lastUpload.count} requirement(s) saved. The original file is not stored for download.
              </div>
            )}

            {/* Ingested Documents List */}
            {documents.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                    <FileText size={14} className="text-blue-600" />
                    <span className="font-medium truncate max-w-[160px]">{d.filename}</span>
                    <span className="text-2xs text-slate-400">({formatBytes(d.sizeBytes)})</span>
                    <Badge variant="success" size="xs">Parsed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Requirement Metric Summary */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Requirement Status Gates</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'Confirmed (Ready for Synthesis)', count: requirements.filter((r) => r.status === 'confirmed').length, color: 'text-green-600 bg-green-50' },
              { label: 'In Review (BA Sign-off Needed)', count: requirements.filter((r) => r.status === 'in_review').length, color: 'text-amber-600 bg-amber-50' },
              { label: 'Extracted (Unreviewed)', count: requirements.filter((r) => r.status === 'extracted').length, color: 'text-slate-600 bg-slate-50' },
              { label: 'Rejected', count: requirements.filter((r) => r.status === 'rejected').length, color: 'text-red-600 bg-red-50' },
            ].map((gate, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{gate.label}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${gate.color}`}>
                  {gate.count}
                </span>
              </div>
            ))}
          </CardBody>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-2xs text-slate-500 rounded-b-xl">
            Confirmed requirements automatically seed User Story prompts.
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full md:w-80">
          <SearchInput
            placeholder="Search by ID, keyword, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={14} className="text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input text-xs py-1 px-2.5 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_review">In Review</option>
              <option value="extracted">Extracted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-input text-xs py-1 px-2.5 rounded-md"
            >
              <option value="all">All Categories</option>
              <option value="security">Security</option>
              <option value="functional">Functional</option>
              <option value="compliance">Compliance</option>
              <option value="performance">Performance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requirements Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="w-24">Req ID</th>
                <th>Requirement Title & Source Context</th>
                <th className="w-32">Category</th>
                <th className="w-24">Priority</th>
                <th className="w-24">Confidence</th>
                <th className="w-28">Status</th>
                <th className="w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReqs.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono text-xs font-semibold text-blue-600">
                    {req.id}
                  </td>
                  <td>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{req.title}</span>
                        {(req.contradictions?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-2xs font-semibold" title="Conflict flagged">
                            <AlertTriangle size={11} /> Conflict
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{req.description}</p>
                      <p className="text-2xs text-slate-400 font-mono">Source: {req.sourceSection || req.sourceDocumentName || req.sourceDocumentId || 'Not recorded'}</p>
                    </div>
                  </td>
                  <td>
                    <Badge variant="outline" size="xs" className="capitalize">
                      {req.category}
                    </Badge>
                  </td>
                  <td>
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td>
                    <span className={`text-xs font-semibold ${(req.confidenceScore ?? 0) >= 90 ? 'text-green-600' : 'text-amber-600'}`}>
                      {req.confidenceScore ?? 0}%
                    </span>
                  </td>
                  <td>
                    <RequirementStatusBadge status={req.status} />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                        title="View Full Detail"
                        aria-label="View detail"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => setEditingReq(req)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                        title="Edit Requirement"
                        aria-label="Edit"
                      >
                        <Edit3 size={15} />
                      </button>
                      {req.status !== 'confirmed' && (
                        <button
                          onClick={() => updateRequirementStatus(req.id, 'confirmed')}
                          className="p-1 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Confirm Requirement"
                          aria-label="Confirm"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {req.status !== 'rejected' && (
                        <button
                          onClick={() => updateRequirementStatus(req.id, 'rejected')}
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Reject Requirement"
                          aria-label="Reject"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Requirement Detail Drawer */}
      <Drawer
        open={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={selectedReq ? `${selectedReq.id}: ${selectedReq.title}` : ''}
        size="lg"
        footer={
          selectedReq && (
            <div className="flex items-center justify-between w-full">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    updateRequirementStatus(selectedReq.id, 'rejected');
                    setSelectedReq(null);
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    updateRequirementStatus(selectedReq.id, 'confirmed');
                    setSelectedReq(null);
                  }}
                >
                  Confirm Requirement
                </Button>
              </div>
              <Button
                variant="secondary"
                size="xs"
                icon={<Sparkles size={14} />}
                onClick={async () => {
                  await generateUserStories([selectedReq.id]);
                  toast({ variant: 'success', title: 'User Story Generated', description: 'Available in Artifacts tab.' });
                }}
              >
                Synthesize Story
              </Button>
            </div>
          )
        }
      >
        {selectedReq && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <RequirementStatusBadge status={selectedReq.status} />
              <PriorityBadge priority={selectedReq.priority} />
              <Badge variant="outline" size="xs" className="capitalize">{selectedReq.category}</Badge>
              <span className="text-xs text-slate-400 font-mono ml-auto">Confidence: {selectedReq.confidenceScore}%</span>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Requirement Text</h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedReq.description}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Source Clause & Attribution</h4>
              <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                {selectedReq.sourceSection || selectedReq.sourceDocumentName || selectedReq.sourceDocumentId || 'Not recorded'}
              </p>
            </div>

            {(selectedReq.contradictions?.length ?? 0) > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} className="text-amber-600" /> Contradiction Analysis
                </h4>
                {(selectedReq.contradictions ?? []).map((c, i) => (
                  <div key={i} className="text-xs text-amber-900 space-y-1">
                    <p><span className="font-semibold">Conflicting Item:</span> {c.targetRequirementId}</p>
                    <p><span className="font-semibold">Description:</span> {c.description}</p>
                    <p className="text-2xs text-amber-700 italic">Severity: {c.severity.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-2xs text-slate-400">
              Extracted: {formatDate(selectedReq.createdAt, 'dd MMM yyyy, HH:mm')} • Last Modified: {formatDate(selectedReq.updatedAt, 'dd MMM yyyy, HH:mm')}
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit Requirement Dialog */}
      <Dialog
        open={!!editingReq}
        onClose={() => setEditingReq(null)}
        title={`Edit ${editingReq?.id}`}
        size="md"
        footer={
          editingReq && (
            <>
              <Button variant="secondary" onClick={() => setEditingReq(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateRequirement(editingReq.id, editingReq);
                  setEditingReq(null);
                }}
              >
                Save Changes
              </Button>
            </>
          )
        }
      >
        {editingReq && (
          <div className="space-y-4">
            <Input
              label="Requirement Title"
              value={editingReq.title}
              onChange={(e) => setEditingReq({ ...editingReq, title: e.target.value })}
            />
            <Textarea
              label="Specification Clause"
              value={editingReq.description}
              onChange={(e) => setEditingReq({ ...editingReq, description: e.target.value })}
              rows={4}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={editingReq.category}
                  onChange={(e) => setEditingReq({ ...editingReq, category: e.target.value as RequirementCategory })}
                  className="form-input text-xs w-full"
                >
                  <option value="functional">Functional</option>
                  <option value="security">Security</option>
                  <option value="compliance">Compliance</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Priority (MoSCoW)</label>
                <select
                  value={editingReq.priority}
                  onChange={(e) => setEditingReq({ ...editingReq, priority: e.target.value as RequirementPriority })}
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

      {/* Add Manual Requirement Dialog */}
      <Dialog
        open={newReqOpen}
        onClose={() => setNewReqOpen(false)}
        title="Add Manual Requirement"
        size="md"
        footer={null}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            addRequirement({
              projectId: projectId || 'proj-001',
              sourceDocumentId: documents[0]?.id || 'doc-manual',
              sourceSection: 'Manual Entry (Direct BA Input)',
              title: data.get('title') as string,
              description: data.get('description') as string,
              category: data.get('category') as RequirementCategory,
              priority: data.get('priority') as RequirementPriority,
              status: 'confirmed',
              confidenceScore: 100,
              contradictions: [],
            });
            setNewReqOpen(false);
          }}
          className="space-y-4"
        >
          <Input label="Title" name="title" required placeholder="e.g. Session Token Invalidation on Timeout" />
          <Textarea label="Clause Description" name="description" required rows={3} placeholder="Describe the behavior or constraint..." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select name="category" className="form-input text-xs w-full">
                <option value="functional">Functional</option>
                <option value="security">Security</option>
                <option value="compliance">Compliance</option>
                <option value="performance">Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
              <select name="priority" className="form-input text-xs w-full">
                <option value="must">Must Have</option>
                <option value="should">Should Have</option>
                <option value="could">Could Have</option>
                <option value="wont">Won't Have</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setNewReqOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Requirement</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
