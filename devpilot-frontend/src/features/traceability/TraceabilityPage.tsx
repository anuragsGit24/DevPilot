import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { api, type ApiTraceabilityMatrix, type ApiTraceabilityLink } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { useToast } from '@/app/providers/ToastProvider';
import {
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  FileText,
  Code2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Filter,
} from 'lucide-react';

export function TraceabilityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    activeProject,
    requirements,
    userStories,
    acceptanceCriteria,
    testCases,
    apiSpec,
  } = useProjectData();
  const { toast } = useToast();

  const [matrixData, setMatrixData] = useState<ApiTraceabilityMatrix | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const effectiveProjectId = projectId || activeProject.id || 'proj-001';

  // Compute fallback/client-side matrix when backend endpoint is loaded or offline
  const localMatrix = useMemo<ApiTraceabilityMatrix>(() => {
    const links: ApiTraceabilityLink[] = requirements.map((req) => {
      // Find matching user stories
      const matchingStories = userStories.filter((s) => {
        const sourceIds = s.sourceRequirementIds || [];
        return sourceIds.includes(req.id) || s.requirementId === req.id || s.title.includes(req.id);
      });
      const storyIds = matchingStories.map((s) => s.id);

      // Find matching criteria
      const matchingCriteria = acceptanceCriteria.filter((c) => {
        return (
          storyIds.includes(c.userStoryId || '') ||
          storyIds.includes(c.storyId || '') ||
          (c.sourceRequirementIds && c.sourceRequirementIds.includes(req.id))
        );
      });
      const criteriaIds = matchingCriteria.map((c) => c.id);

      // Find matching test cases
      const matchingTests = testCases.filter((t) => {
        return (
          (t.acceptanceCriteriaId && criteriaIds.includes(t.acceptanceCriteriaId)) ||
          (t.criteriaId && criteriaIds.includes(t.criteriaId)) ||
          (t.userStoryId && storyIds.includes(t.userStoryId)) ||
          (t.storyId && storyIds.includes(t.storyId)) ||
          (t.sourceRequirementIds && t.sourceRequirementIds.includes(req.id))
        );
      });
      const testIds = matchingTests.map((t) => t.id);

      // Find matching API endpoints
      const endpoints = (apiSpec?.endpoints || []).filter((ep) => {
        const epTags = ep.tags || [];
        return (
          epTags.some((tag: string) => storyIds.includes(tag) || tag === req.id) ||
          ep.path.toLowerCase().includes(req.id.toLowerCase())
        );
      }).map((ep) => `${(ep.method || 'GET').toUpperCase()} ${ep.path}`);

      // Calculate weighted coverage score
      // Story (30%), Criteria (25%), Tests (25%), Endpoints (20%)
      let score = 0;
      if (storyIds.length > 0) score += 30;
      if (criteriaIds.length > 0) score += 25;
      if (testIds.length > 0) score += 25;
      if (endpoints.length > 0) score += 20;

      return {
        requirement_id: req.id,
        requirement_title: req.title || req.id,
        story_ids: storyIds,
        criteria_ids: criteriaIds,
        test_case_ids: testIds,
        spec_endpoints: endpoints,
        coverage_score: score,
      };
    });

    const orphaned = links.filter((l) => l.story_ids.length === 0).map((l) => l.requirement_id);
    const coveredReqs = links.filter((l) => l.coverage_score >= 50).length;
    const overallCoverage = links.length > 0 ? Math.round((coveredReqs / links.length) * 100) : 0;

    // Speculative stories: stories not mapped to any requirement
    const mappedStoryIds = new Set(links.flatMap((l) => l.story_ids));
    const speculative = userStories.filter((s) => !mappedStoryIds.has(s.id)).map((s) => s.id);

    return {
      links,
      orphaned_requirements: orphaned,
      speculative_stories: speculative,
      coverage_score: overallCoverage,
    };
  }, [requirements, userStories, acceptanceCriteria, testCases, apiSpec]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.getTraceabilityMatrix(effectiveProjectId);
      if (res && res.links && res.links.length > 0) {
        setMatrixData(res);
      } else {
        setMatrixData(localMatrix);
      }
    } catch {
      setMatrixData(localMatrix);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMatrix();
  }, [effectiveProjectId, localMatrix]);

  const activeMatrix = matrixData || localMatrix;
  const links = activeMatrix.links || [];

  // Filter links
  const filteredLinks = links.filter((link) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      link.requirement_id.toLowerCase().includes(searchLower) ||
      link.requirement_title.toLowerCase().includes(searchLower) ||
      link.story_ids.some((sid) => sid.toLowerCase().includes(searchLower)) ||
      link.spec_endpoints.some((ep) => ep.toLowerCase().includes(searchLower));

    let matchesCoverage = true;
    if (coverageFilter === 'high') matchesCoverage = link.coverage_score >= 80;
    else if (coverageFilter === 'medium') matchesCoverage = link.coverage_score >= 50 && link.coverage_score < 80;
    else if (coverageFilter === 'low') matchesCoverage = link.coverage_score < 50;

    return matchesSearch && matchesCoverage;
  });

  const completeChainsCount = links.filter((l) => l.coverage_score >= 80).length;
  const overallScore = activeMatrix.coverage_score ?? Math.round((completeChainsCount / (links.length || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <GitBranch size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bi-Directional Traceability Matrix</h1>
              <Badge variant="primary" size="xs">
                Engineer 5
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live deterministic graph linking PRD Requirements ↔ User Stories ↔ Gherkin AC ↔ Test Suites ↔ OpenAPI 3.1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={loadMatrix}
          >
            Re-calculate Matrix
          </Button>
          <Link to={`/projects/${effectiveProjectId}/export`}>
            <Button variant="primary" size="sm">
              Export Traceability Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Traceability</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{overallScore}%</p>
              <p className="text-2xs text-slate-500 mt-0.5">{completeChainsCount} of {links.length} full chains verified</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              overallScore >= 80 ? 'bg-emerald-50 text-emerald-600' : overallScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
            <div
              className={`h-1.5 rounded-full ${
                overallScore >= 80 ? 'bg-emerald-500' : overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(overallScore, 100)}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Requirements Verified</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{links.length}</p>
              <p className="text-2xs text-slate-500 mt-0.5">Ingested & MoSCoW tagged</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Orphaned Requirements</p>
              <p className={`text-2xl font-bold mt-1 ${activeMatrix.orphaned_requirements.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {activeMatrix.orphaned_requirements.length}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">
                {activeMatrix.orphaned_requirements.length === 0 ? 'Zero gaps detected' : 'Missing user story coverage'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Speculative Stories</p>
              <p className={`text-2xl font-bold mt-1 ${activeMatrix.speculative_stories.length > 0 ? 'text-purple-600' : 'text-slate-900'}`}>
                {activeMatrix.speculative_stories.length}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">
                {activeMatrix.speculative_stories.length === 0 ? 'All stories linked to PRD' : 'Stories with unmapped source'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Warnings & Gap Analysis Alerts */}
      {(activeMatrix.orphaned_requirements.length > 0 || activeMatrix.speculative_stories.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMatrix.orphaned_requirements.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Gap Analysis: Orphaned Requirements ({activeMatrix.orphaned_requirements.length})
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  The following requirements do not yet have corresponding User Stories generated:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeMatrix.orphaned_requirements.map((reqId) => (
                    <span key={reqId} className="px-2 py-0.5 rounded font-mono text-2xs font-semibold bg-white border border-amber-200 text-amber-900">
                      {reqId}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMatrix.speculative_stories.length > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-purple-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Traceability Gap: Speculative Stories ({activeMatrix.speculative_stories.length})
                </h4>
                <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                  These stories were generated or manually drafted without explicit reference to a PRD requirement ID:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeMatrix.speculative_stories.map((sid) => (
                    <span key={sid} className="px-2 py-0.5 rounded font-mono text-2xs font-semibold bg-white border border-purple-200 text-purple-900">
                      {sid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Traceability Matrix Table */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Search requirement, story ID, or API endpoint..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Coverage:</span>
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
                {(['all', 'high', 'medium', 'low'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCoverageFilter(filter)}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                      coverageFilter === filter
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter === 'high' ? '≥80%' : filter === 'medium' ? '50-79%' : filter === 'low' ? '<50%' : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table text-left">
              <thead>
                <tr>
                  <th className="w-48">PRD Requirement</th>
                  <th className="w-48">User Story</th>
                  <th className="w-40">Acceptance Criteria</th>
                  <th className="w-40">Test Cases</th>
                  <th className="w-56">OpenAPI Endpoints</th>
                  <th className="w-32 text-right">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <GitBranch size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No traceability records matched filters</p>
                      <p className="text-2xs text-slate-400 mt-1">Try clearing your search query or adjusting coverage filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((link) => (
                    <tr key={link.requirement_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* PRD Requirement */}
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-2xs bg-blue-50 text-blue-700 border border-blue-200">
                            {link.requirement_id}
                          </span>
                          <p className="text-2xs text-slate-600 line-clamp-2" title={link.requirement_title}>
                            {link.requirement_title}
                          </p>
                        </div>
                      </td>

                      {/* User Stories */}
                      <td className="py-3 px-4">
                        {link.story_ids.length === 0 ? (
                          <span className="text-2xs text-amber-600 italic">None (Orphaned)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {link.story_ids.map((sid) => (
                              <span
                                key={sid}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-2xs bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                <Layers size={10} />
                                {sid}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Acceptance Criteria */}
                      <td className="py-3 px-4">
                        {link.criteria_ids.length === 0 ? (
                          <span className="text-2xs text-slate-400 italic">No criteria</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {link.criteria_ids.slice(0, 3).map((cid) => (
                              <span
                                key={cid}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-2xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                <CheckCircle2 size={10} />
                                {cid}
                              </span>
                            ))}
                            {link.criteria_ids.length > 3 && (
                              <span className="text-3xs text-slate-500 font-semibold self-center">
                                +{link.criteria_ids.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Test Cases */}
                      <td className="py-3 px-4">
                        {link.test_case_ids.length === 0 ? (
                          <span className="text-2xs text-slate-400 italic">No tests</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {link.test_case_ids.slice(0, 3).map((tid) => (
                              <span
                                key={tid}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-2xs bg-teal-50 text-teal-700 border border-teal-200"
                              >
                                <ShieldCheck size={10} />
                                {tid}
                              </span>
                            ))}
                            {link.test_case_ids.length > 3 && (
                              <span className="text-3xs text-slate-500 font-semibold self-center">
                                +{link.test_case_ids.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* OpenAPI Endpoints */}
                      <td className="py-3 px-4">
                        {link.spec_endpoints.length === 0 ? (
                          <span className="text-2xs text-slate-400 italic">No contract mapped</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {link.spec_endpoints.slice(0, 2).map((ep, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-3xs bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[200px]"
                                title={ep}
                              >
                                <Code2 size={10} className="text-cyan-600 flex-shrink-0" />
                                <span className="truncate">{ep}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Coverage Progress Score */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`font-bold font-mono text-xs ${
                              link.coverage_score >= 80
                                ? 'text-emerald-700'
                                : link.coverage_score >= 50
                                ? 'text-amber-700'
                                : 'text-red-600'
                            }`}
                          >
                            {link.coverage_score}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                link.coverage_score >= 80
                                  ? 'bg-emerald-500'
                                  : link.coverage_score >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${link.coverage_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
