import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, SprintStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Misc';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/date';
import type { Sprint, UserStory } from '@/types/domain';
import {
  Calendar, AlertTriangle, Plus, CheckCircle2,
  Clock, ArrowRight, ArrowLeftRight, Sparkles, Layers,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function SprintPlanningPage() {
  const { sprints, userStories, assignStoryToSprint, createSprint } = useProjectData();
  const { toast } = useToast();

  const [activeSprintId, setActiveSprintId] = useState<string>('');
  const [newSprintOpen, setNewSprintOpen] = useState(false);

  const activeSprint = sprints.find((s) => s.id === activeSprintId)
    ?? sprints.find((s) => s.status === 'active')
    ?? sprints[0];

  // Stories currently assigned to the active sprint
  const assignedStories = userStories.filter((s) => (activeSprint?.userStoryIds ?? []).includes(s.id));

  // Stories assigned to no sprint or other sprints
  const unassignedStories = userStories.filter((s) => {
    return !sprints.some((sp) => (sp.userStoryIds ?? []).includes(s.id));
  });

  // Calculate current sprint total points
  const targetVel = activeSprint?.targetVelocity ?? 40;
  const totalAllocated = assignedStories.reduce((acc, s) => acc + (s.storyPoints ?? 0), 0);
  const isOverloaded = totalAllocated > targetVel;
  const overloadDelta = totalAllocated - targetVel;

  const handleRebalance = () => {
    // Automatically defer lowest priority story to Sprint 3 or backlog
    if (assignedStories.length > 0) {
      const deferStory = assignedStories[assignedStories.length - 1];
      assignStoryToSprint(deferStory.id, 'sprint-003');
      toast({
        variant: 'info',
        title: 'Story Rebalanced',
        description: `Moved ${deferStory.id} (${deferStory.storyPoints ?? 0} pts) to Sprint 3.`,
      });
    }
  };

  if (!activeSprint) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sprint Planning & Velocity Allocation</h2>
            <p className="text-xs text-slate-500">Plan development cycles and track story points</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setNewSprintOpen(true)}>
            New Sprint
          </Button>
        </div>
        <Card className="p-12 text-center text-slate-500">
          No sprints configured for this project yet. Click "New Sprint" to plan your first sprint.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sprints Navigation Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {sprints.map((sp) => (
            <button
              key={sp.id}
              onClick={() => setActiveSprintId(sp.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeSprintId === sp.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{sp.name}</span>
              <span
                className={`text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                  activeSprintId === sp.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sp.allocatedStoryPoints} pts
              </span>
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setNewSprintOpen(true)}
        >
          New Sprint
        </Button>
      </div>

      {/* Active Sprint Capacity & Velocity Card */}
      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <SprintStatusBadge status={activeSprint.status} />
              <span className="text-xs text-slate-400 font-mono">
                {formatDate(activeSprint.startDate, 'dd MMM')} – {formatDate(activeSprint.endDate, 'dd MMM yyyy')}
              </span>
            </div>
          }
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">{activeSprint.name}</h2>
            <p className="text-xs text-slate-600 mt-0.5"><span className="font-semibold text-slate-800">Sprint Goal:</span> {activeSprint.goal}</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Capacity Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Allocated Capacity: {totalAllocated} / {activeSprint.capacityStoryPoints} pts
              </span>
              <span className={`font-bold ${isOverloaded ? 'text-red-600' : 'text-blue-600'}`}>
                Team Historical Velocity: {activeSprint.targetVelocity} pts
              </span>
            </div>
            <ProgressBar
              value={totalAllocated}
              max={activeSprint.capacityStoryPoints}
              size="lg"
              color={isOverloaded ? 'red' : 'blue'}
            />
          </div>

          {/* Overload Alert Warning */}
          {isOverloaded && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                    Velocity Allocation Exceeded (+{overloadDelta} pts Over Target)
                  </h4>
                  <p className="text-xs text-red-800 mt-0.5">
                    Sprint story points ({totalAllocated} pts) exceed the demonstrated team velocity ({activeSprint.targetVelocity} pts).
                    Risk of sprint rollover is HIGH. Defer lower-priority stories to Sprint 3 to maintain commit integrity.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="xs"
                className="flex-shrink-0"
                icon={<ArrowRight size={13} />}
                onClick={handleRebalance}
              >
                Rebalance Backlog
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sprints Board: Assigned vs Backlog Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Sprint Committed Stories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>{activeSprint.name} Committed Backlog</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                {assignedStories.length} Stories ({totalAllocated} pts)
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {assignedStories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                No stories assigned to this sprint yet. Use Move action below.
              </div>
            ) : (
              assignedStories.map((s) => (
                <Card key={s.id} className="p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{s.id}</span>
                        <PriorityBadge priority={s.priority} />
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {s.storyPoints} pts
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900">{s.title}</h4>
                      <p className="text-2xs text-slate-500 line-clamp-1">{s.action}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <select
                        className="form-input text-2xs py-1 px-2 rounded"
                        value={activeSprint.id}
                        onChange={(e) => assignStoryToSprint(s.id, e.target.value === 'none' ? null : e.target.value)}
                      >
                        {sprints.map((sp) => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                        <option value="none">Send to Backlog</option>
                      </select>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Unassigned Product Backlog */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>Unassigned Product Backlog</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                {unassignedStories.length} Stories
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {unassignedStories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                All synthesized user stories are assigned to sprint releases.
              </div>
            ) : (
              unassignedStories.map((s) => (
                <Card key={s.id} className="p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600">{s.id}</span>
                        <PriorityBadge priority={s.priority} />
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {s.storyPoints} pts
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800">{s.title}</h4>
                      <p className="text-2xs text-slate-500 line-clamp-1">{s.action}</p>
                    </div>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => assignStoryToSprint(s.id, activeSprint.id)}
                    >
                      + Add to {activeSprint.name}
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Sprint Dialog */}
      <Dialog
        open={newSprintOpen}
        onClose={() => setNewSprintOpen(false)}
        title="Create New Sprint Cycle"
        size="md"
        footer={null}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            createSprint({
              projectId: 'proj-001',
              name: data.get('name') as string,
              goal: data.get('goal') as string,
              startDate: data.get('startDate') as string,
              endDate: data.get('endDate') as string,
              capacityStoryPoints: Number(data.get('capacity') || 40),
              allocatedStoryPoints: 0,
              targetVelocity: 34,
              status: 'planning',
              userStoryIds: [],
            });
            setNewSprintOpen(false);
          }}
          className="space-y-4"
        >
          <Input label="Sprint Name" name="name" required placeholder="e.g. Sprint 4: Performance & Hardening" />
          <Textarea label="Sprint Objective / Goal" name="goal" required rows={2} placeholder="Focus on load testing and MFA fallback..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" name="startDate" type="date" required defaultValue="2026-11-01" />
            <Input label="End Date" name="endDate" type="date" required defaultValue="2026-11-14" />
          </div>
          <Input label="Team Capacity (Story Points)" name="capacity" type="number" defaultValue="40" required />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setNewSprintOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Sprint</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
