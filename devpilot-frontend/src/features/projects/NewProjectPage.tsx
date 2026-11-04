import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Check, FolderPlus, Upload } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function NewProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProject, uploadRequirementsFile } = useProjectData();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
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

      const newProj = await createProject({
        name: name.trim(),
        description,
        tags,
        status: 'active',
        createdBy: user?.id || '',
      });

      if (selectedFile) {
        try { await uploadRequirementsFile(selectedFile, newProj.id); }
        catch (error) {
          toast({ variant: 'error', title: 'Project created; document upload failed', description: error instanceof Error ? error.message : 'Retry the upload from Requirements.' });
          navigate(`/projects/${newProj.id}/requirements`);
          return;
        }
      }

      toast({ variant: 'success', title: 'Project Initialized', description: 'Redirecting to requirements workspace...' });
      navigate(`/projects/${newProj.id}/requirements`);
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Failed to create project',
        description: error instanceof Error ? error.message : 'Could not create the project.',
      });
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">New project</h1>
              <p className="text-xs text-slate-500">Set up your project and add an optional requirements document.</p>
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
              label="Description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline project objectives, key stakeholders, and compliance domains..."
              rows={3}
            />

            <Input
              label="Tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. payments, cloud, pci-dss"
              hint="Separate tags with commas."
            />

            {/* Optional Document Upload Zone */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Requirements document (optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Upload PDF, DOCX, or Markdown specification'}
                </p>
                <p className="text-2xs text-slate-400 mt-1">Up to 10 MB · PDF, DOCX, TXT, or Markdown</p>
                <input
                  type="file"
                  id="brd-file-input"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 10 * 1024 * 1024) {
                      toast({ variant: 'error', title: 'File is too large', description: 'Choose a file under 10 MB.' });
                      e.target.value = '';
                      setSelectedFile(null);
                    } else if (file) setSelectedFile(file);
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Link to="/projects">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
              <Button type="submit" variant="primary" loading={loading} icon={<Check size={16} />}>
                Create project
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
