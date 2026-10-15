import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, PromptStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { CodeBlock } from '@/components/ui/Misc';
import { formatDate } from '@/lib/date';
import {
  ArrowLeft, Play, Save, History, Sparkles,
  CheckCircle2, Copy, FileText, Check,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function PromptDetailPage() {
  const { promptId } = useParams<{ promptId: string }>();
  const { prompts, updatePrompt, testPrompt } = useProjectData();
  const { toast } = useToast();

  const prompt = prompts.find((p) => p.id === promptId) ?? prompts[0];

  const versions = prompt?.versions ?? [];
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(prompt?.activeVersion ?? versions[0]?.versionNumber ?? 1);
  const activeVer = versions.find((v) => v.versionNumber === selectedVersionNum) ?? versions[0];

  const varList: string[] = prompt?.variables
    ? (typeof prompt.variables[0] === 'string' ? (prompt.variables as string[]) : (prompt.variables as any[]).map((v) => v.name))
    : (activeVer?.variables ? (activeVer.variables as any[]).map((v) => (typeof v === 'string' ? v : v.name)) : ['requirement', 'context']);

  const [templateText, setTemplateText] = useState(activeVer?.templateText || activeVer?.content || '');
  const [variableInputs, setVariableInputs] = useState<Record<string, string>>({
    requirement: 'Biometric Authentication (TouchID/FaceID) with 3-attempt lockout and PIN fallback',
    context: 'iOS and Android native mobile banking app',
  });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleRunPlayground = async () => {
    if (!prompt) return;
    setTesting(true);
    try {
      const res = await testPrompt(prompt.id, variableInputs);
      setTestResult(res);
      toast({ variant: 'success', title: 'Playground Execution Succeeded', description: 'Generated simulated output in 980ms.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveVersion = () => {
    if (!prompt) return;
    const updatedVersions = versions.map((v) =>
      v.versionNumber === selectedVersionNum ? { ...v, templateText } : v,
    );
    updatePrompt(prompt.id, { versions: updatedVersions });
    toast({ variant: 'success', title: 'Prompt Saved', description: `Updated v${selectedVersionNum} template instructions.` });
  };

  if (!prompt) {
    return (
      <div className="space-y-6">
        <div>
          <Link to="/prompts" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={14} /> Back to Prompt Library
          </Link>
        </div>
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <p className="text-slate-500">Prompt template not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link to="/prompts" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} /> Back to Prompt Library
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{prompt.name}</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
              {prompt.id}
            </span>
            {activeVer && <PromptStatusBadge status={activeVer.status} />}
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{prompt.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Version Switcher */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Version:</span>
            <select
              value={selectedVersionNum}
              onChange={(e) => {
                const verNum = Number(e.target.value);
                setSelectedVersionNum(verNum);
                const target = versions.find((v) => v.versionNumber === verNum);
                if (target) setTemplateText(target.templateText || target.content || '');
              }}
              className="form-input text-xs py-1 px-2.5 rounded-lg font-mono font-semibold"
            >
              {versions.map((v) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  v{v.versionNumber} ({v.status})
                </option>
              ))}
            </select>
          </div>

          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSaveVersion}>
            Save Template
          </Button>
        </div>
      </div>

      {/* Main Grid: Template Editor vs Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Editor */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">System Instruction Prompt</h3>
                <p className="text-2xs text-slate-500">Edit LLM behavioral instructions and variable slots</p>
              </div>
              <div className="flex gap-1">
                {varList.map((v) => (
                  <span key={v} className="text-2xs px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono rounded">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={16}
              className="font-mono text-xs leading-relaxed"
            />
            <div className="flex items-center justify-between text-2xs text-slate-400 border-t border-slate-100 pt-3">
              <span>Benchmark accuracy: {activeVer.benchmarkScore}%</span>
              <span>Tokens estimate: ~480 tokens</span>
            </div>
          </CardBody>
        </Card>

        {/* Playground Simulator */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Interactive Playground</h3>
                <p className="text-2xs text-slate-500">Provide synthetic inputs to test LLM output</p>
              </div>
              <Button
                variant="primary"
                size="xs"
                icon={<Play size={12} />}
                loading={testing}
                onClick={handleRunPlayground}
              >
                Execute Test Run
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Variable Inputs */}
            <div className="space-y-3">
              {varList.map((v) => (
                <div key={v}>
                  <label className="block text-2xs font-mono font-semibold text-slate-700 uppercase mb-1">
                    {`{{${v}}}`}
                  </label>
                  <Input
                    value={variableInputs[v] || ''}
                    onChange={(e) => setVariableInputs({ ...variableInputs, [v]: e.target.value })}
                    placeholder={`Input value for ${v}...`}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Test Run Output */}
            <div className="space-y-1.5">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                Simulated Output Response
              </span>
              {testResult ? (
                <CodeBlock
                  code={testResult}
                  language="json"
                  title="LLM Synthesis Result"
                  maxHeight="260px"
                />
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  Click "Execute Test Run" to evaluate prompt responses with current inputs.
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
