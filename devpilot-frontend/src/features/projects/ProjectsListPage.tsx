import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { scoreBgColor } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import {
  FolderOpen, Plus, Users, FileText, Layers,
  ChevronRight, Calendar, Tag, Sparkles,
} from 'lucide-react';

export function ProjectsListPage() {
  const { projects } = useProjectData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'on_hold'>('all');

  const filteredProjects = projects.filter((p) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (p.name ?? '').toLowerCase().includes(searchLower) ||
      (p.description ?? '').toLowerCase().includes(searchLower) ||
      (p.tags ?? []).some((t) => (t ?? '').toLowerCase().includes(searchLower));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Projects</h1>
          <p className="text-sm text-slate-500">Manage and monitor AI-assisted SDLC initiatives across Barclays portfolios</p>
        </div>
        <Link to="/projects/new">
          <Button variant="primary" icon={<Plus size={16} />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Search projects, tags, descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto">
          {(['all', 'active', 'on_hold', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}/overview`}
            className="group block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
          >
            <Card className="h-full hover:shadow-card-hover hover:border-slate-300 transition-all duration-150 flex flex-col justify-between">
              <CardBody className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                    <FolderOpen size={20} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === 'active' ? 'success' : 'default'} dot>
                      {p.status}
                    </Badge>
                    <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${scoreBgColor(p.qualityScore)}`}>
                      {p.qualityScore}%
                    </span>
                  </div>
                </div>

                {/* Title & Desc */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {p.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-2xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      #{tag}
                    </span>
                  ))}
                  {p.tags.length > 3 && (
                    <span className="text-2xs text-slate-400 self-center">+{p.tags.length - 3}</span>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{p.requirementCount}</p>
                    <p className="text-2xs text-slate-400">Requirements</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{p.artifactCount}</p>
                    <p className="text-2xs text-slate-400">Artifacts</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{p.memberCount}</p>
                    <p className="text-2xs text-slate-400">Members</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-2xs text-slate-400 pt-1">
                  <span>Updated {formatDate(p.updatedAt, 'dd MMM yyyy')}</span>
                  <span className="flex items-center text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform">
                    Enter <ChevronRight size={13} />
                  </span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
