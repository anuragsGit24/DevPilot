import React from 'react';
import { Link } from 'react-router-dom';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardHeader, CardBody, MetricCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar, Avatar } from '@/components/ui/Misc';
import { formatDate } from '@/lib/date';
import {
  FileText, Layers, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, TrendingUp, Calendar, Upload, Plus, ShieldCheck,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

export function DashboardPage() {
  const { user } = useAuth();
  const { dashboard, activeProject, activities } = useProjectData();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium">
            <Sparkles size={13} className="text-blue-300" />
            <span>AI SDLC Co-Pilot Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Engineer'}
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Project <span className="font-semibold text-white">{activeProject.name}</span> has 8 items awaiting your review and 1 active sprint velocity alert.
          </p>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/projects/${activeProject.id}/requirements`}>
            <Button variant="secondary" size="sm" icon={<Upload size={14} />}>
              Upload BRD
            </Button>
          </Link>
          <Link to={`/projects/${activeProject.id}/sprints`}>
            <Button variant="primary" size="sm" icon={<Calendar size={14} />}>
              Sprint Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Confirmed Requirements"
          value={`${dashboard?.confirmedRequirements ?? 0} / ${dashboard?.requirementCount ?? 0}`}
          sub="83% confirmation rate"
          color="blue"
          icon={<FileText size={20} />}
        />
        <MetricCard
          label="Generated Artifacts"
          value={(dashboard?.artifactCounts?.user_stories ?? 0) + (dashboard?.artifactCounts?.acceptance_criteria ?? 0) + (dashboard?.artifactCounts?.test_cases ?? 0)}
          sub="Stories, Criteria, Tests & Specs"
          color="purple"
          icon={<Layers size={20} />}
        />
        <MetricCard
          label="Quality Benchmark"
          value={`${dashboard?.qualityScore ?? 0}%`}
          trend={{ value: 4.2, label: 'vs last cycle' }}
          color="green"
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Active Sprint Progress"
          value={`${dashboard?.activeSprintProgress ?? 0}%`}
          sub="Sprint 2: 18 / 47 pts completed"
          color="amber"
          icon={<Calendar size={20} />}
        />
      </div>

      {/* Warnings & Actionable Alerts */}
      {(dashboard?.warnings ?? []).length > 0 && (
        <div className="dashboard-attention bg-amber-50 border border-amber-200/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-xs uppercase tracking-wider">
            <AlertTriangle size={15} className="text-amber-600" />
            <span>Attention Required ({(dashboard?.warnings ?? []).length} items)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(dashboard?.warnings ?? []).map((warn, i) => (
              <div key={i} className="dashboard-attention__item text-xs text-amber-900 bg-white/70 p-2.5 rounded-lg border border-amber-100 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            action={
              <Link to={`/projects/${activeProject.id}/evaluations`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View Runs <ArrowRight size={12} />
              </Link>
            }
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">Synthetic Quality Trend</h2>
              <p className="text-xs text-slate-500">6-Month historical AI synthesis benchmark accuracy</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard?.evaluationTrend ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0070ba" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0070ba" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => formatDate(d, 'MMM')} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c2340', borderColor: '#1e3a5f', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: number) => [`${val}% Quality`, 'Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke="#0070ba" strokeWidth={2.5} fillOpacity={1} fill="url(#qualityGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Prompt Performance Leaderboard */}
        <Card>
          <CardHeader
            action={
              <Link to="/prompts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                All Prompts <ArrowRight size={12} />
              </Link>
            }
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">Prompt Benchmarks</h2>
              <p className="text-xs text-slate-500">Top-performing production templates</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {(dashboard?.promptPerformance ?? []).map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 truncate max-w-[180px]">{item.name}</span>
                  <span className="font-semibold text-blue-600">{item.score}%</span>
                </div>
                <ProgressBar value={item.score} size="sm" color={item.score >= 75 ? 'green' : item.score >= 70 ? 'blue' : 'amber'} />
                <div className="flex justify-between text-2xs text-slate-400">
                  <span>{item.runs} production runs</span>
                  <span>Target: ≥70%</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity Feed & Project Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Stream */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Audit & Activity Log</h2>
              <p className="text-xs text-slate-500">Real-time team and pipeline interactions</p>
            </div>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <Avatar name={act.userName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800">
                    <span className="font-semibold text-slate-900">{act.userName}</span> {act.action}
                    {act.entityTitle && <span className="font-mono text-blue-600 ml-1">[{act.entityTitle}]</span>}
                  </p>
                  <p className="text-2xs text-slate-400 mt-0.5">{formatDate(act.timestamp, 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <Badge variant="outline" size="xs">
                  {act.entityType || act.resourceType || 'general'}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* SDLC Stage Health Checklist */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-base font-semibold text-slate-900">SDLC Governance</h2>
              <p className="text-xs text-slate-500">Pipeline compliance gates</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { stage: 'BRD Ingestion & Extraction', status: 'Passed', icon: CheckCircle2, color: 'text-green-600' },
              { stage: 'User Story Synthesis', status: 'Passed', icon: CheckCircle2, color: 'text-green-600' },
              { stage: 'Gherkin Criteria Validation', status: 'In Review', icon: AlertTriangle, color: 'text-amber-500' },
              { stage: 'Test Case Automation Coverage', status: 'Needs Attention', icon: AlertTriangle, color: 'text-amber-500' },
              { stage: 'OpenAPI Spec Synchronization', status: 'Verified', icon: ShieldCheck, color: 'text-blue-600' },
            ].map((gate, i) => {
              const Icon = gate.icon;
              return (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-700">{gate.stage}</span>
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={gate.color} />
                    <span className="text-xs font-semibold text-slate-600">{gate.status}</span>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
