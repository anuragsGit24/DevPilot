import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Check, FolderPlus, Upload, Shield } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function NewProjectPage() {
  const navigate = useNavigate();
  const { createProject, uploadDocument } = useProjectData();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('banking, mobile, retail');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const newProj = createProject({
        name,
        description,
        tags,
        status: 'active',
        createdBy: 'usr-002',
      });

      if (selectedFile) {
        await uploadDocument(
          { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type },
          newProj.id,
        );
      }

      toast({ variant: 'success', title: 'Project Initialized', description: 'Redirecting to requirements workspace...' });
      navigate(`/projects/${newProj.id}/requirements`);
    } catch {
      toast({ variant: 'error', title: 'Failed to create project' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FolderPlus size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Enterprise SDLC Project</h1>
              <p className="text-xs text-slate-500">Configure new project workspace with optional initial BRD upload</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Project Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wealth Management Advisory Portal"
            />

            <Textarea
              label="Project Scope & Executive Summary"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline project objectives, key stakeholders, and compliance domains..."
              rows={3}
            />

            <Input
              label="Project Tags (Comma Separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. payments, cloud, pci-dss"
              hint="Tags assist AI categorization and cross-project knowledge indexing"
            />

            {/* Optional Document Upload Zone */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Initial BRD / PRD Source Document (Optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Upload PDF, DOCX, or Markdown specification'}
                </p>
                <p className="text-2xs text-slate-400 mt-1">Up to 25MB • Automated requirement extraction ready</p>
                <input
                  type="file"
                  id="brd-file-input"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="mt-3"
                  onClick={() => document.getElementById('brd-file-input')?.click()}
                >
                  {selectedFile ? 'Change File' : 'Browse File'}
                </Button>
              </div>
            </div>

            {/* Compliance Badge Note */}
            <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800">
              <Shield size={16} className="text-blue-600 flex-shrink-0" />
              <span>Project will inherit default Barclays SDLC governance gates and role-based policies.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Link to="/projects">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
              <Button type="submit" variant="primary" loading={loading} icon={<Check size={16} />}>
                Initialize Project Workspace
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
