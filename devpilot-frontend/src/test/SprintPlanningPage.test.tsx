import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SprintPlanningPage } from '../features/sprints/SprintPlanningPage';
import { ToastProvider } from '../app/providers/ToastProvider';

const mockAssignStory = vi.fn();
const mockCreateSprint = vi.fn();
const mockDeleteSprint = vi.fn().mockResolvedValue(undefined);
const mockPlanSprints = vi.fn().mockResolvedValue({
  sprints: [],
  total_sprints: 0,
  total_stories_planned: 0,
  total_story_points: 0,
});
const mockRefreshSprints = vi.fn().mockResolvedValue([]);

const mockSprints = [
  {
    id: 'sprint-1',
    projectId: 'proj-001',
    name: 'Sprint 1',
    goal: 'Customer authentication and ledger sync',
    startDate: '2026-11-01T00:00:00Z',
    endDate: '2026-11-14T00:00:00Z',
    status: 'active' as const,
    capacityStoryPoints: 30,
    allocatedStoryPoints: 13,
    targetVelocity: 30,
    totalPoints: 13,
    completedPoints: 0,
    userStoryIds: ['US-001', 'US-002'],
    warnings: [],
  },
  {
    id: 'sprint-2',
    projectId: 'proj-001',
    name: 'Sprint 2',
    goal: 'Transfer orchestration',
    startDate: '2026-11-15T00:00:00Z',
    endDate: '2026-11-28T00:00:00Z',
    status: 'planning' as const,
    capacityStoryPoints: 30,
    allocatedStoryPoints: 8,
    targetVelocity: 30,
    totalPoints: 8,
    completedPoints: 0,
    userStoryIds: ['US-003'],
    warnings: [],
  },
];

let mockUserStories: any[] = [
  {
    id: 'US-001',
    projectId: 'proj-001',
    title: 'Customer Authentication',
    action: 'authenticate with biometrics',
    priority: 'must' as const,
    storyPoints: 5,
    status: 'accepted' as const,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'US-002',
    projectId: 'proj-001',
    title: 'Account Ledger Ingestion',
    action: 'query balance',
    priority: 'must' as const,
    storyPoints: 8,
    status: 'accepted' as const,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'US-003',
    projectId: 'proj-001',
    title: 'Domestic Transfer API',
    action: 'send funds',
    priority: 'should' as const,
    storyPoints: 8,
    status: 'draft' as const,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'US-004',
    projectId: 'proj-001',
    title: 'Unassigned Notification Story',
    action: 'receive SMS alerts',
    priority: 'could' as const,
    storyPoints: 2,
    status: 'draft' as const,
    createdAt: '',
    updatedAt: '',
  },
];

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', email: 'admin@devpilot.test', role: 'admin' },
  }),
}));

vi.mock('@/app/providers/ProjectDataProvider', () => ({
  useProjectData: () => ({
    activeProject: { id: 'proj-001', name: 'Test Banking Project' },
    sprints: mockSprints,
    userStories: mockUserStories,
    assignStoryToSprint: mockAssignStory,
    createSprint: mockCreateSprint,
    deleteSprint: mockDeleteSprint,
    planSprints: mockPlanSprints,
    refreshSprints: mockRefreshSprints,
    isProcessing: { planSprints: false },
  }),
}));

describe('SprintPlanningPage Component (Engineer 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserStories = [
      {
        id: 'US-001',
        projectId: 'proj-001',
        title: 'Customer Authentication',
        action: 'authenticate with biometrics',
        priority: 'must' as const,
        storyPoints: 5,
        status: 'accepted' as const,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'US-002',
        projectId: 'proj-001',
        title: 'Account Ledger Ingestion',
        action: 'query balance',
        priority: 'must' as const,
        storyPoints: 8,
        status: 'accepted' as const,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'US-003',
        projectId: 'proj-001',
        title: 'Domestic Transfer API',
        action: 'send funds',
        priority: 'should' as const,
        storyPoints: 8,
        status: 'draft' as const,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'US-004',
        projectId: 'proj-001',
        title: 'Unassigned Notification Story',
        action: 'receive SMS alerts',
        priority: 'could' as const,
        storyPoints: 2,
        status: 'draft' as const,
        createdAt: '',
        updatedAt: '',
      },
    ];
  });

  it('renders active sprint details, velocity, and story lists', () => {
    render(
      <ToastProvider>
        <SprintPlanningPage />
      </ToastProvider>
    );

    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument();
    expect(screen.getByText(/Customer authentication and ledger sync/i)).toBeInTheDocument();
    expect(screen.getByText(/Allocated Capacity: 13 \/ 30 pts/i)).toBeInTheDocument();
    expect(screen.getByText('US-001')).toBeInTheDocument();
    expect(screen.getByText('US-002')).toBeInTheDocument();
    expect(screen.getByText('Unassigned Product Backlog')).toBeInTheDocument();
    expect(screen.getByText('US-004')).toBeInTheDocument();
  });

  it('clicking Refresh triggers refreshSprints', async () => {
    render(
      <ToastProvider>
        <SprintPlanningPage />
      </ToastProvider>
    );

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    expect(mockRefreshSprints).toHaveBeenCalled();
  });

  it('opens Auto-Plan dialog and triggers planSprints with real project stories', async () => {
    render(
      <ToastProvider>
        <SprintPlanningPage />
      </ToastProvider>
    );

    const autoPlanBtn = screen.getByRole('button', { name: /Auto-Plan/i });
    await act(async () => {
      fireEvent.click(autoPlanBtn);
    });

    expect(screen.getByText(/Automated Sprint Planning & Fibonacci Estimation/i)).toBeInTheDocument();
    expect(screen.getByText(/4 user story\/stories/i)).toBeInTheDocument();
    const generateBtn = screen.getByRole('button', { name: /Generate Sprint Plan/i });
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockPlanSprints).toHaveBeenCalled();
  });

  it('shows delete sprint button for authorized users and triggers deleteSprint', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ToastProvider>
        <SprintPlanningPage />
      </ToastProvider>
    );

    const deleteBtn = screen.getByRole('button', { name: /Delete Sprint/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(mockDeleteSprint).toHaveBeenCalledWith('sprint-1');
  });

  it('shows empty backlog alert and disables submit when project has 0 stories', async () => {
    mockUserStories = [];

    render(
      <ToastProvider>
        <SprintPlanningPage />
      </ToastProvider>
    );

    const autoPlanBtn = screen.getByRole('button', { name: /Auto-Plan/i });
    await act(async () => {
      fireEvent.click(autoPlanBtn);
    });

    expect(screen.getByText(/Active Project Backlog Is Empty/i)).toBeInTheDocument();
    expect(screen.getByText(/Stories must be added or generated before planning/i)).toBeInTheDocument();
    const generateBtn = screen.getByRole('button', { name: /Generate Sprint Plan/i });
    expect(generateBtn).toBeDisabled();
  });
});
