import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CodeBlock } from '@/components/ui/Misc';
import { SearchInput } from '@/components/ui/Input';
import {
  Code2, Sparkles, Check, ChevronDown, ChevronRight,
  ExternalLink, Copy,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import type { ApiEndpoint } from '@/types/domain';

const methodColors: Record<string, string> = {
  get: 'bg-blue-100 text-blue-700 border-blue-200',
  post: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  put: 'bg-amber-100 text-amber-700 border-amber-200',
  delete: 'bg-red-100 text-red-700 border-red-200',
};

export function ApiSpecPage() {
  const { apiSpec, generateApiEndpoints, isProcessing } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'endpoints' | 'yaml'>('endpoints');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    'post-/api/v2/auth/biometric/login': true,
  });

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const endpoints = (apiSpec?.endpoints ?? []).map((endpoint) => ({
    ...endpoint,
    method: String(endpoint.method ?? 'GET').toUpperCase() as ApiEndpoint['method'],
    path: endpoint.path ?? '',
    summary: endpoint.summary ?? '',
    description: endpoint.description ?? '',
    tags: Array.isArray(endpoint.tags) ? endpoint.tags : [],
    responses: endpoint.responses && typeof endpoint.responses === 'object'
      ? Object.fromEntries(Object.entries(endpoint.responses).map(([code, response]) => [
        code,
        { description: typeof response?.description === 'string' ? response.description : 'No description provided.' },
      ]))
      : { default: { description: 'No response schema provided.' } },
  }));
  const filteredEndpoints = endpoints.filter((ep) => {
    const searchLower = search.toLowerCase();
    return (
      (ep.path ?? '').toLowerCase().includes(searchLower) ||
      (ep.summary ?? '').toLowerCase().includes(searchLower) ||
      (ep.method ?? '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Code2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{apiSpec?.title ?? 'API Specification'}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                OAS {apiSpec?.openApiVersion ?? '3.1.0'}
              </span>
            </div>
            <p className="text-xs text-slate-500">{apiSpec?.description ?? ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('endpoints')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                viewMode === 'endpoints' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Interactive Explorer
            </button>
            <button
              onClick={() => setViewMode('yaml')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                viewMode === 'yaml' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Raw OpenAPI YAML
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            loading={isProcessing.generateApi}
            onClick={() => generateApiEndpoints([])}
          >
            Resync with Stories
          </Button>
        </div>
      </div>

      {viewMode === 'yaml' ? (
        <Card>
          <CardBody className="p-0">
            <CodeBlock
              code={apiSpec?.rawYaml ?? '# No OpenAPI YAML has been generated yet.'}
              language="yaml"
              title="openapi.yaml (OAS 3.1)"
              maxHeight="600px"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="w-full sm:w-80">
            <SearchInput
              placeholder="Filter paths, methods, summaries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          {filteredEndpoints.map((ep) => {
            const key = `${ep.method}-${ep.path}`;
            const isOpen = !!expandedEndpoints[key];
            const methodClass = methodColors[ep.method] || 'bg-slate-100 text-slate-700';

            return (
              <Card key={key} className="overflow-hidden">
                {/* Endpoint Header Bar */}
                <div
                  onClick={() => toggleEndpoint(key)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono uppercase border ${methodClass}`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">{ep.path}</span>
                    <span className="text-xs text-slate-500 hidden sm:inline">— {ep.summary}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                    <p className="text-slate-600">{ep.description}</p>

                    {/* Parameters / Request Body */}
                    {ep.requestBody && (
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-slate-700 uppercase text-2xs tracking-wider">
                          Request Body
                        </h4>
                        <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-2xs overflow-x-auto">
                          <pre>{JSON.stringify(ep.requestBody, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* Response Codes */}
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-700 uppercase text-2xs tracking-wider">Responses</h4>
                      <div className="space-y-1">
                        {Object.entries(ep.responses).map(([statusCode, resp]) => (
                          <div
                            key={statusCode}
                            className="flex items-center gap-3 p-2 rounded bg-white border border-slate-200"
                          >
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-2xs ${
                                Number(statusCode) < 300
                                  ? 'bg-green-100 text-green-700'
                                  : Number(statusCode) < 500
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {statusCode}
                            </span>
                            <span className="text-slate-700">{resp?.description ?? 'No description provided.'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
