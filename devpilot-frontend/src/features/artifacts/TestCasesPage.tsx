import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, ArtifactStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput, Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import type { TestCase } from '@/types/domain';
import {
  ShieldCheck, CheckCircle2, XCircle, Edit3, Play,
  Clock, Check, AlertCircle, FileText,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function TestCasesPage() {
  const { testCases, updateTestCase, updateTestCaseStatus, isProcessing } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);

  const filteredTests = testCases.filter((tc) => {
    const searchLower = search.toLowerCase();
    return (
      (tc.title ?? '').toLowerCase().includes(searchLower) ||
      (tc.expectedResult ?? '').toLowerCase().includes(searchLower) ||
      (tc.id ?? '').toLowerCase().includes(searchLower)
    );
  });

  const handleSimulateRun = (id: string) => {
    setRunningTestId(id);
    setTimeout(() => {
      setRunningTestId(null);
      toast({
        variant: 'success',
        title: 'Automated Test Passed',
        description: `${id} passed all assertion checks in 240ms.`,
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search test cases, steps, outcomes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {testCases.length} Test Cases Total ({testCases.filter((t) => t.automationStatus === 'automated').length} Automated)
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-4">
        {filteredTests.map((tc) => (
          <Card key={tc.id}>
            <CardHeader
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    icon={<Play size={12} className="text-green-600" />}
                    loading={runningTestId === tc.id}
                    onClick={() => handleSimulateRun(tc.id)}
                  >
                    Execute Run
                  </Button>
                  <button
                    onClick={() => setEditingTest(tc)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                    title="Edit Test Case"
                  >
                    <Edit3 size={15} />
                  </button>
                  {tc.status !== 'accepted' && (
                    <button
                      onClick={() => updateTestCaseStatus(tc.id, 'accepted')}
                      className="p-1.5 text-slate-400 hover:text-green-600 rounded"
                      title="Accept Test Case"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  )}
                  {tc.status !== 'rejected' && (
                    <button
                      onClick={() => updateTestCaseStatus(tc.id, 'rejected')}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      title="Reject Test Case"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-600">{tc.id}</span>
                    <Badge variant={tc.testType === 'security' ? 'danger' : 'info'} size="xs" className="uppercase">
                      {tc.testType}
                    </Badge>
                    <Badge variant={tc.automationStatus === 'automated' ? 'success' : 'default'} size="xs">
                      {tc.automationStatus}
                    </Badge>
                    <ArtifactStatusBadge status={tc.status} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{tc.title}</h3>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Preconditions */}
              {tc.preconditions.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Preconditions</h4>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                    {tc.preconditions.map((pre, i) => (
                      <li key={i}>{pre}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Execution Steps Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left w-14">Step</th>
                      <th className="py-2 px-3 text-left">Action</th>
                      <th className="py-2 px-3 text-left">Expected Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tc.steps.map((s) => (
                      <tr key={s.stepNumber} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-500">#{s.stepNumber}</td>
                        <td className="py-2 px-3 text-slate-800">{s.action}</td>
                        <td className="py-2 px-3 text-slate-600">{s.expectedResult}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Final Expected Result */}
              <div className="flex items-start gap-2 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <Check size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Terminal Verification: </span>
                  <span>{tc.expectedResult}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Edit Test Dialog */}
      <Dialog
        open={!!editingTest}
        onClose={() => setEditingTest(null)}
        title={`Edit ${editingTest?.id}`}
        size="md"
        footer={
          editingTest && (
            <>
              <Button variant="secondary" onClick={() => setEditingTest(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateTestCase(editingTest.id, editingTest);
                  setEditingTest(null);
                }}
              >
                Save Test
              </Button>
            </>
          )
        }
      >
        {editingTest && (
          <div className="space-y-4">
            <Input
              label="Test Title"
              value={editingTest.title}
              onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
            />
            <Textarea
              label="Expected Terminal Verification"
              value={editingTest.expectedResult}
              onChange={(e) => setEditingTest({ ...editingTest, expectedResult: e.target.value })}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Automation Status</label>
                <select
                  value={editingTest.automationStatus}
                  onChange={(e) => setEditingTest({ ...editingTest, automationStatus: e.target.value as any })}
                  className="form-input text-xs w-full"
                >
                  <option value="automated">Automated</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Test Type</label>
                <select
                  value={editingTest.testType}
                  onChange={(e) => setEditingTest({ ...editingTest, testType: e.target.value as any })}
                  className="form-input text-xs w-full"
                >
                  <option value="integration">Integration</option>
                  <option value="unit">Unit</option>
                  <option value="e2e">End-to-End</option>
                  <option value="security">Security</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
