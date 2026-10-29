import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge, SprintStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Misc';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/date';
import type { Sprint } from '@/types/domain';
import {
  AlertTriangle, Plus, CheckCircle2, Sparkles, RefreshCw, GitCommit
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function SprintPlanningPage() {
  const {
    activeProject,
    sprints,
    userStories,
    assignStoryToSprint,
    createSprint,
    deleteSprint,
    planSprints,
    refreshSprints,
    isProcessing,
  } = useProjectData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeSprintId, setActiveSprintId] = useState<string>('');
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [autoPlanOpen, setAutoPlanOpen] = useState(false);
  const [targetCapacity, setTargetCapacity] = useState(30);
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [planningError, setPlanningError] = useState<string | null>(null);

  const canManageSprints = user?.role === 'admin' || user?.role === 'project_manager';

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
  const targetVel = activeSprint?.targetVelocity ?? activeSprint?.capacityStoryPoints ?? 30;
  const totalAllocated = activeSprint?.allocatedStoryPoints ?? assignedStories.reduce((acc, s) => acc + (s.storyPoints ?? 0), 0);
  const isOverloaded = totalAllocated > targetVel;
  const overloadDelta = totalAllocated - targetVel;

  const handleRebalance = () => {
    if (assignedStories.length > 0) {
      const deferStory = assignedStories[assignedStories.length - 1];
      assignStoryToSprint(deferStory.id, sprints[sprints.length - 1]?.id ?? null);
      toast({
        variant: 'info',
        title: 'Story Rebalanced',
        description: `Moved ${deferStory.id} (${deferStory.storyPoints ?? 0} pts) to later cycle.`,
      });
    }
  };

  const handleRunAutoPlan = async () => {
    setPlanningError(null);
    if (userStories.length === 0) {
      setPlanningError('No user stories found in the active project. Stories must be added or generated before planning. Planning cannot proceed with an empty backlog.');
      return;
    }
    try {
      await planSprints({
        capacityStoryPoints: Number(targetCapacity),
        sprintDurationWeeks: Number(durationWeeks),
      });
      setAutoPlanOpen(false);
    } catch (err: any) {
      setPlanningError(err.message || 'Failed to generate sprint plan');
    }
  };

  const handleRefresh = async () => {
    await refreshSprints();
    toast({ variant: 'info', title: 'Sprints Refreshed', description: 'Fetched latest plans from backend.' });
  };

  const handleDeleteSprint = async (sprintId: string, sprintName: string) => {
    if (window.confirm(`Delete ${sprintName}? Unfinished user stories will remain safely in the project backlog.`)) {
      try {
        await deleteSprint(sprintId);
      } catch (err: any) {
        toast({ variant: 'error', title: 'Failed to delete sprint', description: err.message });
      }
    }
  };

  if (!activeSprint) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sprint Planning & Velocity Allocation</h2>
            <p className="text-xs text-slate-500">Plan development cycles with Fibonacci estimation & dependency topological sort</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={() => setAutoPlanOpen(true)}
            >
              Auto-Plan Sprints
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setNewSprintOpen(true)}
            >
              Manual Sprint
            </Button>
          </div>
        </div>

        {planningError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Planning Error</h4>
              <p className="text-xs mt-0.5">{planningError}</p>
            </div>
          </div>
        )}

        <Card className="p-12 text-center text-slate-500 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <GitCommit size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Sprints Configured</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the automated dependency-aware planner to sequence user stories and fit them into velocity-constrained sprints, or create a sprint cycle manually.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={() => setAutoPlanOpen(true)}
            >
              Run Automated Sprint Planner
            </Button>
          </div>
        </Card>

        {/* Auto Plan Dialog (Empty Backlog Guarded) */}
        <Dialog
          open={autoPlanOpen}
          onClose={() => setAutoPlanOpen(false)}
          title="Automated Sprint Planning & Fibonacci Estimation"
          size="md"
          footer={null}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              The engine estimates story points on the Fibonacci scale (1, 2, 3, 5, 8, 13), checks for dependency cycles, topologically sequences stories, and packs them into capacity-constrained sprints.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Target Velocity / Capacity (Points)"
                type="number"
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(Number(e.target.value))}
                min={5}
                max={200}
                required
              />
              <Input
                label="Sprint Duration (Weeks)"
                type="number"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                min={1}
                max={6}
                required
              />
            </div>

            {userStories.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950">Active Project Backlog Is Empty</p>
                  <p className="text-2xs text-amber-800 mt-0.5">
                    Stories must be added or generated before planning. Planning cannot proceed with an empty backlog.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{userStories.length} user story/stories</span> from the active project backlog will be scheduled.
              </div>
            )}

            {planningError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {planningError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setAutoPlanOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                loading={isProcessing.planSprints}
                disabled={userStories.length === 0}
                onClick={handleRunAutoPlan}
              >
                Generate Sprint Plan
              </Button>
            </div>
          </div>
        </Dialog>

        {/* New Manual Sprint Dialog */}
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
                projectId: activeProject?.id || 'proj-001',
                name: data.get('name') as string,
                goal: data.get('goal') as string,
                startDate: data.get('startDate') as string,
                endDate: data.get('endDate') as string,
                capacityStoryPoints: Number(data.get('capacity') || 30),
                allocatedStoryPoints: 0,
                targetVelocity: Number(data.get('capacity') || 30),
                status: 'planning',
                userStoryIds: [],
              });
              setNewSprintOpen(false);
            }}
            className="space-y-4"
          >
            <Input label="Sprint Name" name="name" required placeholder="e.g. Sprint 1: Foundation" />
            <Textarea label="Sprint Objective / Goal" name="goal" required rows={2} placeholder="Focus on architecture and auth..." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" name="startDate" type="date" required defaultValue="2026-11-01" />
              <Input label="End Date" name="endDate" type="date" required defaultValue="2026-11-14" />
            </div>
            <Input label="Team Capacity (Story Points)" name="capacity" type="number" defaultValue="30" required />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setNewSprintOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Create Sprint</Button>
            </div>
          </form>
        </Dialog>
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
                activeSprintId === sp.id || (!activeSprintId && sp.id === activeSprint.id)
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{sp.name}</span>
              <span
                className={`text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                  activeSprintId === sp.id || (!activeSprintId && sp.id === activeSprint.id)
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sp.allocatedStoryPoints ?? sp.totalPoints ?? 0} pts
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => setAutoPlanOpen(true)}
          >
            Auto-Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setNewSprintOpen(true)}
          >
            New Sprint
          </Button>
        </div>
      </div>

      {planningError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Planning Error</h4>
            <p className="text-xs mt-0.5">{planningError}</p>
          </div>
        </div>
      )}

      {/* Active Sprint Capacity & Velocity Card */}
      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <SprintStatusBadge status={activeSprint.status} />
              <span className="text-xs text-slate-400 font-mono">
                {formatDate(activeSprint.startDate, 'dd MMM')} – {formatDate(activeSprint.endDate, 'dd MMM yyyy')}
              </span>
              {canManageSprints && (
                <Button
                  variant="outline"
                  size="xs"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-2"
                  onClick={() => handleDeleteSprint(activeSprint.id, activeSprint.name)}
                >
                  Delete Sprint
                </Button>
              )}
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
                Allocated Capacity: {totalAllocated} / {activeSprint.capacityStoryPoints ?? 30} pts
              </span>
              <span className={`font-bold ${isOverloaded ? 'text-red-600' : 'text-blue-600'}`}>
                {isOverloaded ? `Overloaded (+${overloadDelta} pts)` : 'Within Planned Velocity'}
              </span>
            </div>
            <ProgressBar
              value={totalAllocated}
              max={activeSprint.capacityStoryPoints ?? 30}
              color={isOverloaded ? 'red' : 'blue'}
            />
          </div>

          {/* Overload Alert with Rebalance Button */}
          {isOverloaded && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={16} />
                <span className="text-xs text-red-800">
                  Sprint capacity exceeded by {overloadDelta} story points. High risk of spillover.
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                className="text-red-700 border-red-300 hover:bg-red-100"
                onClick={handleRebalance}
              >
                Rebalance
              </Button>
            </div>
          )}

          {/* Warnings List */}
          {activeSprint.warnings && activeSprint.warnings.length > 0 && (
            <div className="space-y-1 pt-1">
              {activeSprint.warnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-2xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Main Dual-Column Board Layout: Sprint Stories & Unassigned Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Stories in Active Sprint */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Stories in {activeSprint.name}</span>
              <Badge variant="primary" size="xs">{assignedStories.length}</Badge>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Sum: {assignedStories.reduce((acc, s) => acc + (s.storyPoints ?? 0), 0)} pts
            </span>
          </div>

          <div className="space-y-2.5">
            {assignedStories.length === 0 ? (
              <Card className="p-8 text-center text-slate-400 border-dashed">
                <p className="text-xs">No user stories assigned to this sprint.</p>
                <p className="text-2xs text-slate-400 mt-1">Assign stories from the backlog on the right.</p>
              </Card>
            ) : (
              assignedStories.map((s) => (
                <Card key={s.id} className="p-3.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xs font-bold text-blue-600">{s.id}</span>
                        <PriorityBadge priority={s.priority} />
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {s.storyPoints ?? 0} pts
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800">{s.title}</h4>
                      <p className="text-2xs text-slate-500 line-clamp-1">{s.action || s.benefit}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => assignStoryToSprint(s.id, null)}
                      className="text-slate-400 hover:text-red-600"
                      title="Move back to backlog"
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Unassigned Product Backlog */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Unassigned Product Backlog</span>
              <Badge variant="default" size="xs">{unassignedStories.length}</Badge>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Backlog: {unassignedStories.reduce((acc, s) => acc + (s.storyPoints ?? 0), 0)} pts
            </span>
          </div>

          <div className="space-y-2.5">
            {unassignedStories.length === 0 ? (
              <Card className="p-8 text-center text-slate-400 border-dashed">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-xs font-medium text-slate-700">Product Backlog Empty</p>
                <p className="text-2xs text-slate-400 mt-1">All project stories have been scheduled into development sprints.</p>
              </Card>
            ) : (
              unassignedStories.map((s) => (
                <Card key={s.id} className="p-3.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xs font-bold text-slate-500">{s.id}</span>
                        <PriorityBadge priority={s.priority} />
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {s.storyPoints ?? 0} pts
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800">{s.title}</h4>
                      <p className="text-2xs text-slate-500 line-clamp-1">{s.action || s.benefit}</p>
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

      {/* Auto Plan Dialog */}
      <Dialog
        open={autoPlanOpen}
        onClose={() => setAutoPlanOpen(false)}
        title="Automated Sprint Planning & Fibonacci Estimation"
        size="md"
        footer={null}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            The planner uses Fibonacci estimation (1, 2, 3, 5, 8, 13) based on acceptance criteria, dependencies, and risk. Stories are topologically sequenced and packed into capacity-bounded sprints.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target Velocity / Capacity (Points)"
              type="number"
              value={targetCapacity}
              onChange={(e) => setTargetCapacity(Number(e.target.value))}
              min={5}
              max={200}
              required
            />
            <Input
              label="Sprint Duration (Weeks)"
              type="number"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
              min={1}
              max={6}
              required
            />
          </div>

          {userStories.length === 0 ? (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Active Project Backlog Is Empty</p>
                <p className="text-2xs text-amber-800 mt-0.5">
                  Stories must be added or generated before planning. Planning cannot proceed with an empty backlog.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{userStories.length} user story/stories</span> from the active project backlog will be scheduled.
            </div>
          )}

          {planningError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {planningError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setAutoPlanOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={isProcessing.planSprints}
              disabled={userStories.length === 0}
              onClick={handleRunAutoPlan}
            >
              Generate Sprint Plan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* New Manual Sprint Dialog */}
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
              projectId: activeSprint.projectId || 'proj-001',
              name: data.get('name') as string,
              goal: data.get('goal') as string,
              startDate: data.get('startDate') as string,
              endDate: data.get('endDate') as string,
              capacityStoryPoints: Number(data.get('capacity') || 30),
              allocatedStoryPoints: 0,
              targetVelocity: Number(data.get('capacity') || 30),
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
          <Input label="Team Capacity (Story Points)" name="capacity" type="number" defaultValue="30" required />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setNewSprintOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Sprint</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
