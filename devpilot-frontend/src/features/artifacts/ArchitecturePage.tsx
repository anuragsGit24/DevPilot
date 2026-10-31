import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Input';
import {
  Cpu, Sparkles, Shield, AlertTriangle, CheckCircle2,
  Database, Server, Network
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { MermaidViewer } from '@/components/diagrams/MermaidViewer';

export function ArchitecturePage() {
  const { architecture, generateArchitectureRecommendation, isProcessing } = useProjectData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'stack' | 'diagram' | 'datastores' | 'adrs' | 'risks' | 'tradeoffs'>('stack');
  const [modalOpen, setModalOpen] = useState(false);
  const [customContext, setCustomContext] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const components = architecture?.components ?? [];
  const decisions = architecture?.decisions ?? [];
  const risks = architecture?.risks ?? [];
  const dataStores = architecture?.dataStores ?? architecture?.data_stores ?? [];
  const resiliencePatterns = architecture?.resiliencePatterns ?? architecture?.resilience_patterns ?? [];
  const rawRationale = architecture?.rationale;
  const rationale = rawRationale ? rawRationale.replace(/Signal scores: \{[^}]+\}\.\s*/g, '') : '';
  const evidence = architecture?.evidence ?? [];
  const pattern = architecture?.pattern ?? 'Modular Monolith';
  const provider = architecture?.provider ?? 'rules_based';

  const formatProviderLabel = (p: string) => {
    if (p.startsWith('llm:')) {
      const model = p.replace('llm:', '').toUpperCase();
      return `AI Provider: ${model}`;
    }
    if (p === 'llm') {
      return 'AI Provider: Gemini';
    }
    return 'Engine: Rules-Based';
  };

  const handleSynthesize = async (contextToUse?: string) => {
    setErrorMessage(null);
    try {
      await generateArchitectureRecommendation(contextToUse);
      setModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize architecture');
    }
  };

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
              <Badge variant="primary" size="xs">{pattern}</Badge>
              <Badge variant="outline" size="xs" className="uppercase font-mono text-2xs">
                {formatProviderLabel(provider)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {architecture?.summary || 'Analyze requirements and synthesize an enterprise architecture blueprint.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            Custom Constraints
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            loading={isProcessing.generateArch}
            onClick={() => handleSynthesize(customContext || undefined)}
          >
            Synthesize Blueprint
          </Button>
        </div>
      </div>

      {/* Error state alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Architecture Synthesis Error</h4>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Rationale & Evidence Card */}
      {rationale && (
        <Card className="bg-slate-50/70 border-slate-200">
          <CardBody className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Architectural Rationale</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{rationale}</p>
            {evidence.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5 items-center">
                <span className="text-2xs font-semibold text-slate-500 uppercase">Evidence Signals:</span>
                {evidence.map((ev, i) => (
                  <Badge key={i} variant="outline" size="xs" className="bg-white text-slate-700">
                    {ev}
                  </Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {components.length === 0 && !isProcessing.generateArch && (
        <Card className="p-12 text-center text-slate-500 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Cpu size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Architecture Recommendation Persisted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Synthesize Blueprint" to analyze project requirements or provide custom constraints such as high-throughput, compliance, or microservice boundaries.
          </p>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => handleSynthesize()}
          >
            Generate Architecture Blueprint
          </Button>
        </Card>
      )}

      {/* Content Tabs if components exist */}
      {components.length > 0 && (
        <>
          {/* Secondary Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
            {[
              { id: 'diagram', label: 'Topology Diagram (Live)', count: 'Live' },
              { id: 'stack', label: 'Tech Stack & Components', count: components.length },
              { id: 'datastores', label: 'Data Stores & Topology', count: dataStores.length },
              { id: 'adrs', label: 'Architectural Decision Records (ADRs)', count: decisions.length },
              { id: 'risks', label: 'Security & Risk Matrix', count: risks.length },
              { id: 'tradeoffs', label: 'Tradeoff Evaluations', count: architecture?.alternatives?.length ?? 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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

          {/* Tab 0: Interactive Topology Diagram */}
          {activeTab === 'diagram' && (
            <div className="space-y-4">
              <MermaidViewer
                chart={
                  (architecture as any)?.mermaid_diagram ||
                  (architecture as any)?.mermaidDiagram ||
                  `flowchart TD
    subgraph Clients["Client Presentation Tier"]
        Web["Web Application (React 19)"]
        Mobile["Mobile Banking App"]
    end

    subgraph Security["Edge Security & Routing"]
        WAF["Cloud Armor / WAF"]
        APIGW["API Gateway / Envoy Proxy"]
        AuthSvc["Auth & Token Engine (JWT / mTLS)"]
    end

    subgraph CoreServices["Domain Microservices"]
        ${components.map((c, i) => `S${i}["${c.name}\\n(${c.technology})"]`).join('\n        ') || 'Core["Retail Banking Engine"]'}
    end

    subgraph DataTier["Data & Event Fabric"]
        ${dataStores.map((d, i) => `DB${i}[("${d.type || 'DataStore'}\\n${d.technology}")]`).join('\n        ') || 'DB[("Cloud SQL PostgreSQL 16")]'}
        Cache[("Redis Distributed Cache")]
        EventBus["Kafka Event Streaming Backbone"]
    end

    Web --> WAF
    Mobile --> WAF
    WAF --> APIGW
    APIGW --> AuthSvc
    APIGW --> CoreServices
    CoreServices --> DataTier
`
                }
                title={`${architecture?.pattern || 'Software'} Architecture Topology`}
              />
            </div>
          )}

          {/* Tab 1: Components & Stack */}
          {activeTab === 'stack' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {components.map((c, i) => (
                <Card key={i} className="hover:border-slate-300 transition-colors shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Server size={15} />
                        </div>
                        <span className="font-semibold text-slate-900 text-sm leading-snug">{c.name}</span>
                      </div>
                      <Badge variant="primary" size="xs" className="flex-shrink-0">{c.technology}</Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3 py-3">
                    <div>
                      <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Architectural Role</span>
                      <p className="text-xs font-medium text-slate-700">{c.role}</p>
                    </div>

                    {c.responsibilities && c.responsibilities.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Responsibilities:</span>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          {c.responsibilities.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-2xs text-slate-400 font-medium block mb-0.5">Security Safeguard:</span>
                      <p className="text-xs text-emerald-700 font-medium">
                        {architecture?.securityConsiderations[i] ?? architecture?.securityConsiderations[0] ?? 'Defense-in-depth isolation applied'}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* Tab 2: Data Stores & Topology */}
          {activeTab === 'datastores' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Server size={18} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Deployment Topology</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {architecture?.deploymentTopology || 'GCP Cloud Run serverless container runtime with Cloud SQL Auth Proxy.'}
                  </p>
                </CardBody>
              </Card>

              {resiliencePatterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-emerald-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Resilience & Fault Tolerance Patterns</h3>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {resiliencePatterns.map((rp: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs text-emerald-900 font-medium">
                          <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                          <span>{rp}</span>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataStores.map((ds: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Database size={16} className="text-indigo-600" />
                          <span className="text-sm font-semibold text-slate-900">{ds.type} Store</span>
                        </div>
                        <Badge variant="primary" size="xs">{ds.technology}</Badge>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <p className="text-xs text-slate-600">{ds.rationale}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: ADRs */}
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

          {/* Tab 4: Risks & Safeguards */}
          {activeTab === 'risks' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>Identified Threat / Risk</th>
                      <th className="w-24">Severity</th>
                      <th className="w-24">Probability</th>
                      <th>Prescribed Mitigation Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {risks.map((r, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-slate-900 text-xs">{r}</td>
                        <td>
                          <Badge variant="warning" size="xs" className="uppercase">Medium</Badge>
                        </td>
                        <td className="capitalize text-xs text-slate-600">Monitored</td>
                        <td className="text-xs text-slate-700">
                          <div className="flex items-start gap-1.5">
                            <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                            <span>{architecture?.securityConsiderations[i] ?? architecture?.securityConsiderations[0] ?? 'Enforce automated vulnerability scanning and RBAC.'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Tab 5: Tradeoffs */}
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
        </>
      )}

      {/* Custom Constraints Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Custom Architecture Constraints"
        size="md"
        footer={null}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide explicit requirement signals, target traffic volume (e.g. 50k TPS), compliance boundaries (e.g. PCI-DSS, GDPR), or operational constraints to guide pattern selection independently of uploaded PRD documents.
          </p>
          <Textarea
            label="Constraints / Non-Functional Requirements"
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            rows={4}
            placeholder="e.g. High-scale retail banking application requiring 100k requests/sec, PCI-DSS Level 1 compliance, event streaming with Kafka, and sub-100ms latency."
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={isProcessing.generateArch}
              onClick={() => handleSynthesize(customContext)}
            >
              Synthesize Blueprint
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
