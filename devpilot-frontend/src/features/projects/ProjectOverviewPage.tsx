import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar, ProgressBar } from '@/components/ui/Misc';
import { formatBytes } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import { DEMO_USERS } from '@/mocks/seed-data/project-retail-banking';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import {
  FileText, Layers, Calendar, BarChart3,
  Sparkles, CheckCircle2, ChevronRight,
  Shield, Code2, Cpu, ArrowUpRight,
} from 'lucide-react';

export function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, documents, requirements, userStories, testCases, activities } = useProjectData();

  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Project Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">Please select an existing project from the projects list.</p>
          <div className="mt-4">
            <Link to="/projects">
              <Button variant="primary" size="sm">Go to Projects</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const projectActivities = activities.slice(0, 6);

  const modules = [
    {
      title: 'Requirements Ingestion',
      count: `${requirements.length} Requirements`,
      desc: 'Extracted from BRD documents with automated contradiction and priority tags',
      path: `/projects/${project.id}/requirements`,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'User Story Synthesis',
      count: `${userStories.length} User Stories`,
      desc: 'Structured with role-action-benefit personas and estimated story points',
      path: `/projects/${project.id}/artifacts?tab=user_stories`,
      icon: Layers,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Acceptance Criteria & Gherkin',
      count: '4 Criteria',
      desc: 'Given-When-Then behavioral test scenarios ready for QA validation',
      path: `/projects/${project.id}/artifacts?tab=acceptance_criteria`,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Test Cases & Automation',
      count: `${testCases.length} Test Cases`,
      desc: 'Step-by-step test executions and automation status mapping',
      path: `/projects/${project.id}/artifacts?tab=test_cases`,
      icon: Shield,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'OpenAPI 3.1 Specification',
      count: '4 Endpoints',
      desc: 'Swagger/OpenAPI contract generated directly from functional requirements',
      path: `/projects/${project.id}/artifacts?tab=api_spec`,
      icon: Code2,
      color: 'bg-cyan-50 text-cyan-600',
    },
    {
      title: 'Architecture Recommendations',
      count: '1 Blueprint',
      desc: 'Tech stack, architectural tradeoffs, security safeguards, and risk matrix',
      path: `/projects/${project.id}/artifacts?tab=architecture`,
      icon: Cpu,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Sprint Planning & Velocity',
      count: '2 Sprints',
      desc: 'Capacity allocation, story assignment, and automated velocity overload warnings',
      path: `/projects/${project.id}/sprints`,
      icon: Calendar,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      title: 'AI Synthesis Evaluations',
      count: '3 Benchmarks',
      desc: 'Completeness, relevance, accuracy, and hallucination scoring',
      path: `/projects/${project.id}/evaluations`,
      icon: BarChart3,
      color: 'bg-teal-50 text-teal-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* SDLC Modules Grid */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">SDLC Generation Workspaces</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <Link key={i} to={mod.path} className="group block focus:outline-none">
                <Card className="h-full hover:shadow-card-hover hover:border-slate-300 transition-all duration-150 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${mod.color}`}>
                        <Icon size={18} />
                      </div>
                      <ArrowUpRight size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">{mod.count}</p>
                    <p className="text-2xs text-slate-500 mt-1 leading-normal">{mod.desc}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Row 2: Documents & Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Documents */}
        <Card className="lg:col-span-2">
          <CardHeader
            action={
              <Link to={`/projects/${project.id}/requirements`}>
                <Button variant="outline" size="xs">Upload BRD</Button>
              </Link>
            }
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">Source Specification Documents</h2>
              <p className="text-xs text-slate-500">Business requirements documents ingested into this workspace</p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {projectDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No documents uploaded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectDocs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                        {(doc.mimeType ?? '').includes('pdf') ? 'PDF' : 'DOC'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{doc.filename}</p>
                        <p className="text-2xs text-slate-500 mt-0.5">
                          {formatBytes(doc.sizeBytes)} • {doc.sectionCount} Sections • {doc.extractedRequirementCount} Extracted Items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="xs" dot>Extracted</Badge>
                      <span className="text-2xs text-slate-400">{formatDate(doc.uploadedAt, 'dd MMM')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Assigned Team */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Project Members</h2>
              <p className="text-xs text-slate-500">Assigned enterprise roles</p>
            </div>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100">
            {DEMO_USERS.filter((u) => u.active).slice(0, 5).map((u) => (
              <div key={u.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{u.name}</p>
                    <p className="text-2xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <span className={`text-2xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Row 3: Recent Activity */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Project Audit Activity</h2>
            <p className="text-xs text-slate-500">Immutable trace of changes and AI generations</p>
          </div>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {projectActivities.map((act) => (
            <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar name={act.userName} size="sm" />
                <div>
                  <p className="text-xs text-slate-800">
                    <span className="font-semibold text-slate-900">{act.userName}</span> {act.action}
                    {act.entityTitle && <span className="font-mono text-blue-600 ml-1">({act.entityTitle})</span>}
                  </p>
                  <p className="text-2xs text-slate-400 mt-0.5">{formatDate(act.timestamp, 'dd MMM yyyy, HH:mm')}</p>
                </div>
              </div>
              <Badge variant="outline" size="xs">{act.entityType}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
