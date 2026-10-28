import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Cpu, Sparkles, Shield, AlertTriangle, CheckCircle2,
  Layers, ArrowRight, ExternalLink,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function ArchitecturePage() {
  const { architecture, generateArchitectureRecommendation, isProcessing } = useProjectData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'stack' | 'adrs' | 'risks' | 'tradeoffs'>('stack');

  const components = architecture?.components ?? [];
  const decisions = architecture?.decisions ?? [];
  const risks = architecture?.risks ?? [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Cpu size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{architecture?.title ?? 'Architecture Blueprint'}</h1>
              <Badge variant="primary" size="xs">Synthesized Architecture</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{architecture?.summary ?? ''}</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={14} />}
          loading={isProcessing.generateArch}
          onClick={() => generateArchitectureRecommendation()}
        >
          Re-Synthesize Blueprint
        </Button>
      </div>

      {/* Secondary Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'stack', label: 'Tech Stack & Components', count: components.length },
          { id: 'adrs', label: 'Architectural Decision Records (ADRs)', count: decisions.length },
          { id: 'risks', label: 'Security & Risk Matrix', count: risks.length },
          { id: 'tradeoffs', label: 'Tradeoff Evaluations', count: architecture?.alternatives?.length ?? 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Components & Stack */}
      {activeTab === 'stack' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((c, i) => (
            <Card key={i} className="hover:border-slate-300 transition-colors">
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                  <Badge variant="outline" size="xs">{c.role}</Badge>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-xs text-blue-700 font-semibold">
                  {c.technology}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{c.role}</p>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-2xs text-slate-400 font-medium">Security Safeguard:</span>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    {architecture?.securityConsiderations[i] ?? architecture?.securityConsiderations[0] ?? 'No specific safeguard recorded'}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: ADRs */}
      {activeTab === 'adrs' && (
        <div className="space-y-4">
          {decisions.map((adr, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{adr.id}</span>
                  <h3 className="text-sm font-semibold text-slate-900">{adr.title}</h3>
                  <Badge variant="success" size="xs" dot>Approved</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-2xs tracking-wider">Context & Problem</h4>
                  <p className="text-slate-700 mt-1">{adr.context}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-2xs tracking-wider">Decision Taken</h4>
                  <p className="text-slate-800 font-medium mt-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                    {adr.decision}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-2xs tracking-wider">Consequences & Compliance Impact</h4>
                  <p className="text-slate-600 mt-1">{adr.consequences}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Risks & Safeguards */}
      {activeTab === 'risks' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Identified Threat / Risk</th>
                  <th className="w-24">Severity</th>
                  <th className="w-24">Probability</th>
                  <th>Barclays Prescribed Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-slate-900 text-xs">{r}</td>
                    <td>
                      <Badge variant="warning" size="xs" className="uppercase">Not assessed</Badge>
                    </td>
                    <td className="capitalize text-xs text-slate-600">Not assessed</td>
                    <td className="text-xs text-slate-700">
                      <div className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{architecture?.securityConsiderations[i] ?? 'Review the security considerations for this architecture.'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Tradeoffs */}
      {activeTab === 'tradeoffs' && (
        <div className="space-y-4">
          {(architecture?.alternatives ?? []).map((alternative, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-sm font-semibold text-slate-900">{alternative.name}</h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Architecture alternative
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50/60 border border-green-200 text-green-900">
                    <span className="font-bold text-2xs uppercase tracking-wide block mb-1">Rationale</span>
                    <p className="text-2xs text-green-800">{alternative.rationale}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                    <span className="font-bold text-2xs uppercase tracking-wide block mb-1">Tradeoffs</span>
                    <p className="text-2xs text-slate-600">{alternative.tradeoffs}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
