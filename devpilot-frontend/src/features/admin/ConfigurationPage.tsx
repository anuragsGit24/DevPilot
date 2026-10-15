import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Dialog';
import {
  Settings2, RotateCcw, Cpu, ShieldCheck, Sparkles,
  AlertTriangle, Database, Check,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function ConfigurationPage() {
  const { resetAllData } = useProjectData();
  const { toast } = useToast();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [modelName, setModelName] = useState('claude-3-5-sonnet-20241022 (Simulated)');
  const [temperature, setTemperature] = useState('0.2');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [enforceGuardrails, setEnforceGuardrails] = useState(true);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ variant: 'success', title: 'System Configuration Saved', description: 'Updated AI model hyper-parameters.' });
  };

  const handleResetData = () => {
    resetAllData();
    setConfirmResetOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & AI Configuration (UC-13)</h1>
            <p className="text-xs text-slate-500">Fine-tune generative model guardrails, tokens, and benchmark persistence</p>
          </div>
        </div>
      </div>

      {/* Model & AI Hyperparameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Generative AI Engine Settings</h2>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Foundation Model</label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="form-input text-xs w-full"
                >
                  <option value="claude-3-5-sonnet-20241022 (Simulated)">Claude 3.5 Sonnet (Default for Architecture & Specs)</option>
                  <option value="gpt-4o (Simulated)">GPT-4o (Gherkin Scenarios)</option>
                  <option value="gemini-1.5-pro (Simulated)">Gemini 1.5 Pro (Large BRD Ingestion)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sampling Temperature ({temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full accent-blue-600"
                />
                <p className="text-2xs text-slate-400 mt-1">Lower values ensure deterministic compliance without creative deviation.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Maximum Response Tokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="guardrails-check"
                  checked={enforceGuardrails}
                  onChange={(e) => setEnforceGuardrails(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="guardrails-check" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Enforce Barclays Regulatory & PII Guardrails
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" icon={<Check size={14} />}>
                Save Engine Parameters
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Demo State & Reset Management */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50/50">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-red-600" />
            <div>
              <h2 className="text-base font-semibold text-red-900">Data State & Academic Demonstration Reset</h2>
              <p className="text-2xs text-red-700">Restore baseline seed dataset for evaluation presentations</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            During live walkthroughs or prototype testing, changes are held in client-side storage.
            Executing a reset purges modified requirements, generated user stories, custom prompts, and restores the original RetailBanking v2.0 baseline.
          </p>

          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => setConfirmResetOpen(true)}
          >
            Reset All Data to Factory Benchmark
          </Button>
        </CardBody>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleResetData}
        title="Reset Entire Synthetic Dataset?"
        description="This will clear all in-browser additions, generated artifacts, custom sprint assignments, and revert back to the pristine baseline."
        confirmLabel="Reset Everything"
      />
    </div>
  );
}
