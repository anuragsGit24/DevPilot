import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/app/providers/ToastProvider';
import {
  Download,
  FileCode,
  FileText,
  Layers,
  Code2,
  Archive,
  CheckCircle2,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Calendar,
  AlertCircle,
  FolderArchive,
} from 'lucide-react';

export function ExportHubPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    activeProject,
    requirements,
    userStories,
    acceptanceCriteria,
    testCases,
    apiSpec,
    architecture,
    sprints,
  } = useProjectData();
  const { toast } = useToast();

  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    'markdown',
    'gherkin',
    'openapi_yaml',
    'openapi_json',
    'zip',
  ]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveProjectId = projectId || activeProject.id || 'proj-001';

  const toggleFormat = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId) ? prev.filter((f) => f !== formatId) : [...prev, formatId]
    );
  };

  const selectAll = () => {
    setSelectedFormats(['markdown', 'gherkin', 'openapi_yaml', 'openapi_json', 'architecture', 'zip']);
  };

  // Full ZIP Bundle Export via real backend endpoint
  const handleExportZip = async () => {
    if (selectedFormats.length === 0) {
      toast({
        variant: 'warning',
        title: 'No formats selected',
        description: 'Please select at least one format to include in the export bundle.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const blob = await api.exportZip(effectiveProjectId, selectedFormats);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devpilot-${activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'export'}-bundle.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        variant: 'success',
        title: 'Export Bundle Generated',
        description: `Successfully downloaded multi-format ZIP archive for ${activeProject.name || 'project'}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        variant: 'error',
        title: 'Export Failed',
        description: msg || 'Unable to generate ZIP bundle. Please ensure artifacts are generated.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Instant single-file downloads
  const handleDownloadSingle = (type: 'markdown' | 'gherkin' | 'openapi_json' | 'openapi_yaml') => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (type === 'markdown') {
      content = `# ${activeProject.name || 'Project'} — Requirements & Specification Dossier\n\n` +
        `## Requirements (${requirements.length})\n` +
        requirements.map((r) => `### [${r.id}] ${r.title}\n${r.description}\n`).join('\n') +
        `\n## User Stories (${userStories.length})\n` +
        userStories.map((s) => `### [${s.id}] ${s.title}\nAs a ${s.userRole || 'User'}, I want ${s.action} so that ${s.benefit} (${s.storyPoints || 3} pts)\n`).join('\n');
      filename = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dossier.md`;
      mimeType = 'text/markdown';
    } else if (type === 'gherkin') {
      content = `# DevPilot BDD Feature Suite\nFeature: ${activeProject.name} Acceptance Testing\n\n` +
        acceptanceCriteria.map((c) => `  # Scenario: ${c.scenarioName || c.title}\n${c.gherkin || ''}\n`).join('\n');
      filename = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_scenarios.feature`;
    } else if (type === 'openapi_json') {
      content = JSON.stringify(apiSpec || {}, null, 2);
      filename = 'openapi.json';
      mimeType = 'application/json';
    } else if (type === 'openapi_yaml') {
      content = `# OpenAPI 3.1.0 Specification\nopenapi: 3.1.0\ninfo:\n  title: ${apiSpec?.title || activeProject.name}\n  version: 1.0.0\npaths:\n` +
        (apiSpec?.endpoints || []).map((ep) => `  ${ep.path}:\n    ${(ep.method || 'get').toLowerCase()}:\n      summary: "${ep.summary || ''}"\n      description: "${ep.description || ''}"\n`).join('');
      filename = 'openapi.yaml';
      mimeType = 'text/yaml';
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      variant: 'info',
      title: 'File Downloaded',
      description: `Downloaded ${filename}`,
    });
  };

  const handleCopyClipboard = async (key: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ variant: 'info', title: 'Copied to Clipboard' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium">
            <FolderArchive size={13} className="text-blue-300" />
            <span>Engineer 5 Multi-Format Export Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Artifact Export & Distribution Hub</h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Export all generated specifications, INVEST user stories, Gherkin test scenarios, OpenAPI 3.1 contracts,
            and architecture topologies into standardized enterprise packages or an integrated ZIP bundle.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            icon={<Download size={18} />}
            loading={isExporting}
            onClick={handleExportZip}
            className="w-full sm:w-auto shadow-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3"
          >
            Download ZIP Bundle ({selectedFormats.length} Formats)
          </Button>
        </div>
      </div>

      {/* Manifest Stats Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Requirements</div>
            <div className="text-lg font-bold text-slate-900">{requirements.length}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">User Stories</div>
            <div className="text-lg font-bold text-slate-900">{userStories.length}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Acceptance Criteria</div>
            <div className="text-lg font-bold text-slate-900">{acceptanceCriteria.length}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Test Suites</div>
            <div className="text-lg font-bold text-slate-900">{testCases.length}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
            <Code2 size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">API Endpoints</div>
            <div className="text-lg font-bold text-slate-900">{apiSpec?.endpoints?.length || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Sprints</div>
            <div className="text-lg font-bold text-slate-900">{sprints.length}</div>
          </div>
        </div>
      </div>

      {/* Format Selection Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configurable Export Packages</h2>
            <p className="text-xs text-slate-500">Select formats to include in the ZIP bundle or download individual assets</p>
          </div>
          <button
            onClick={selectAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Select All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Markdown Documentation */}
          <Card
            className={`transition-all duration-200 border-2 cursor-pointer ${
              selectedFormats.includes('markdown') ? 'border-blue-600 shadow-md' : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => toggleFormat('markdown')}
          >
            <CardHeader className="bg-slate-50/50 py-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Markdown Dossier Bundle</h3>
                    <p className="text-2xs text-slate-500">requirements.md, user_stories.md, specs.md</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedFormats.includes('markdown')}
                  onChange={() => toggleFormat('markdown')}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Full documentation dossier formatted for GitHub/GitLab wikis, Notion, and Confluence. Includes
                MoSCoW tags, INVEST criteria, and acceptance checklists.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-2xs font-mono text-slate-400">Target: Markdown / CommonMark</span>
                <Button
                  variant="outline"
                  size="xs"
                  icon={<Download size={12} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSingle('markdown');
                  }}
                >
                  Download .md
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Gherkin .feature Suite */}
          <Card
            className={`transition-all duration-200 border-2 cursor-pointer ${
              selectedFormats.includes('gherkin') ? 'border-blue-600 shadow-md' : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => toggleFormat('gherkin')}
          >
            <CardHeader className="bg-slate-50/50 py-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCode size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Gherkin BDD Feature Suite</h3>
                    <p className="text-2xs text-slate-500">features/*.feature for Cucumber & Playwright</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedFormats.includes('gherkin')}
                  onChange={() => toggleFormat('gherkin')}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Standardized Given-When-Then behavioral test scenarios structured into individual `.feature` files,
                ready for automated QA runners and living documentation pipelines.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-2xs font-mono text-slate-400">Target: Cucumber / Behave</span>
                <Button
                  variant="outline"
                  size="xs"
                  icon={<Download size={12} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSingle('gherkin');
                  }}
                >
                  Download .feature
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Card 3: OpenAPI 3.1 YAML / JSON */}
          <Card
            className={`transition-all duration-200 border-2 cursor-pointer ${
              selectedFormats.includes('openapi_yaml') || selectedFormats.includes('openapi_json')
                ? 'border-blue-600 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => toggleFormat('openapi_yaml')}
          >
            <CardHeader className="bg-slate-50/50 py-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                    <Code2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">OpenAPI 3.1 Specifications</h3>
                    <p className="text-2xs text-slate-500">openapi.yaml and openapi.json</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedFormats.includes('openapi_yaml')}
                  onChange={() => toggleFormat('openapi_yaml')}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                OAS 3.1 service contracts with schemas, endpoints, query parameters, request bodies, and standard
                error responses for Postman, Swagger UI, and code generators.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-2xs font-mono text-slate-400">Target: OAS 3.1.0 / Swagger</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle('openapi_yaml');
                    }}
                  >
                    YAML
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle('openapi_json');
                    }}
                  >
                    JSON
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card 4: Architecture Topology & Sprints */}
          <Card
            className={`transition-all duration-200 border-2 cursor-pointer ${
              selectedFormats.includes('architecture') ? 'border-blue-600 shadow-md' : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => toggleFormat('architecture')}
          >
            <CardHeader className="bg-slate-50/50 py-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Architecture & Sprint Blueprints</h3>
                    <p className="text-2xs text-slate-500">topology.mmd, architecture.md, sprint_schedule.md</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedFormats.includes('architecture')}
                  onChange={() => toggleFormat('architecture')}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Component topology diagrams (Mermaid.js source), ADR decision records, data tier configurations,
                and topologically sorted sprint backlogs with Fibonacci estimations.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-2xs font-mono text-slate-400">Target: Mermaid.js & Sprint Plan</span>
                <Link to={`/projects/${effectiveProjectId}/artifacts?tab=architecture`}>
                  <Button variant="ghost" size="xs" iconRight={<ExternalLink size={12} />}>
                    View Blueprint
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Directory Structure Breakdown Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">ZIP Archive Package Hierarchy</h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="bg-navy-900 p-4 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed rounded-b-lg">
            <div className="text-emerald-400">devpilot-export-{effectiveProjectId.slice(0, 8)}.zip/</div>
            <div className="pl-4 text-slate-400">├── README.md <span className="text-slate-500 text-3xs">// Manifest & cross-references</span></div>
            <div className="pl-4 text-slate-400">├── requirements/</div>
            <div className="pl-8 text-blue-300">└── requirements.md <span className="text-slate-500 text-3xs">// {requirements.length} atomic statements</span></div>
            <div className="pl-4 text-slate-400">├── stories/</div>
            <div className="pl-8 text-purple-300">└── user_stories.md <span className="text-slate-500 text-3xs">// {userStories.length} INVEST stories</span></div>
            <div className="pl-4 text-slate-400">├── specs/</div>
            <div className="pl-8 text-emerald-300">└── acceptance_criteria.md <span className="text-slate-500 text-3xs">// {acceptanceCriteria.length} Gherkin specs</span></div>
            <div className="pl-4 text-slate-400">├── features/</div>
            <div className="pl-8 text-emerald-300">├── all_scenarios.feature</div>
            <div className="pl-8 text-emerald-300">└── ac_*.feature</div>
            <div className="pl-4 text-slate-400">├── tests/</div>
            <div className="pl-8 text-teal-300">└── test_cases.md <span className="text-slate-500 text-3xs">// {testCases.length} automated test suites</span></div>
            <div className="pl-4 text-slate-400">├── openapi/</div>
            <div className="pl-8 text-cyan-300">├── openapi.json</div>
            <div className="pl-8 text-cyan-300">└── openapi.yaml <span className="text-slate-500 text-3xs">// OAS 3.1.0 specifications</span></div>
            <div className="pl-4 text-slate-400">├── architecture/</div>
            <div className="pl-8 text-indigo-300">├── architecture_blueprint.md</div>
            <div className="pl-8 text-indigo-300">└── topology.mmd <span className="text-slate-500 text-3xs">// Mermaid diagram definition</span></div>
            <div className="pl-4 text-slate-400">└── sprints/</div>
            <div className="pl-8 text-amber-300">└── sprint_schedule.md <span className="text-slate-500 text-3xs">// {sprints.length} planned sprints</span></div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

