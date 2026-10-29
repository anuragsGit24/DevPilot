import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { ProjectDataProvider, useProjectData } from '../app/providers/ProjectDataProvider';
import { ToastProvider } from '../app/providers/ToastProvider';
import { api } from '../lib/api';

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isDemoMode: false,
    user: { id: 'usr-1', email: 'test@devpilot.test', role: 'admin' },
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    listProjects: vi.fn(),
    listWorkItems: vi.fn(),
    createWorkItem: vi.fn(),
    updateWorkItem: vi.fn(),
    deleteWorkItem: vi.fn(),
    listArtifacts: vi.fn().mockResolvedValue([]),
    getArtifact: vi.fn(),
  },
}));

function ScopingConsumer() {
  const {
    projects,
    activeProject,
    setActiveProjectId,
    userStories,
    sprints,
    architecture,
    assignStoryToSprint,
  } = useProjectData();

  return (
    <div>
      <div data-testid="active-project-id">{activeProject?.id}</div>
      <div data-testid="active-project-name">{activeProject?.name}</div>

      <div data-testid="story-count">{userStories.length}</div>
      <ul data-testid="stories-list">
        {userStories.map((s) => (
          <li key={s.id}>{s.title}</li>
        ))}
      </ul>

      <div data-testid="sprint-count">{sprints.length}</div>
      <ul data-testid="sprints-list">
        {sprints.map((sp) => (
          <li key={sp.id}>{sp.name}</li>
        ))}
      </ul>

      <div data-testid="arch-pattern">{architecture?.pattern || 'NONE'}</div>

      <button onClick={() => setActiveProjectId('proj-A')}>Select Proj A</button>
      <button onClick={() => setActiveProjectId('proj-B')}>Select Proj B</button>
      <button onClick={() => assignStoryToSprint('US-A2', 'wi-sprint-a1')}>Assign Story</button>
    </div>
  );
}

describe('Project Data Scoping and Cross-Project Isolation (Engineer 3)', () => {
  const mockProjects = [
    { id: 'proj-A', name: 'Banking Core', description: 'Core banking system', created_by: 'usr-1', created_at: '2026-10-01', updated_at: '2026-10-01' },
    { id: 'proj-B', name: 'Fraud Engine', description: 'AI Fraud Detection', created_by: 'usr-1', created_at: '2026-10-01', updated_at: '2026-10-01' },
  ];

  const itemsProjectA = [
    {
      id: 'wi-story-a1',
      project_id: 'proj-A',
      record_type: 'user_story',
      title: 'Ledger Ingestion',
      status: 'accepted',
      payload: { id: 'US-A1', title: 'Ledger Ingestion', storyPoints: 5 },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'wi-story-a2',
      project_id: 'proj-A',
      record_type: 'user_story',
      title: 'Account Query API',
      status: 'draft',
      payload: { id: 'US-A2', title: 'Account Query API', storyPoints: 3 },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'wi-sprint-a1',
      project_id: 'proj-A',
      record_type: 'sprint',
      title: 'Sprint A1',
      status: 'active',
      payload: { sprint_number: 1, name: 'Sprint A1', userStoryIds: ['US-A1'], totalPoints: 5, capacityStoryPoints: 30 },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'wi-arch-a',
      project_id: 'proj-A',
      record_type: 'architecture',
      title: 'Architecture: Modular Monolith',
      status: 'draft',
      payload: { pattern: 'Modular Monolith', summary: 'Monolith blueprint', components: [] },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const itemsProjectB = [
    {
      id: 'wi-story-b1',
      project_id: 'proj-B',
      record_type: 'user_story',
      title: 'Anomaly Scoring Pipeline',
      status: 'draft',
      payload: { id: 'US-B1', title: 'Anomaly Scoring Pipeline', storyPoints: 8 },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'wi-sprint-b1',
      project_id: 'proj-B',
      record_type: 'sprint',
      title: 'Sprint B1: Fraud ML',
      status: 'planning',
      payload: { sprint_number: 1, name: 'Sprint B1: Fraud ML', userStoryIds: ['US-B1'], totalPoints: 8, capacityStoryPoints: 20 },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'wi-arch-b',
      project_id: 'proj-B',
      record_type: 'architecture',
      title: 'Architecture: Event-Driven Microservices',
      status: 'draft',
      payload: { pattern: 'Event-Driven Microservices', summary: 'Event-driven blueprint', components: [] },
      source_ids: [],
      parent_id: null,
      created_by: 'usr-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.listProjects as any).mockResolvedValue(mockProjects);
    (api.listWorkItems as any).mockImplementation(async (projectId: string) => {
      if (projectId === 'proj-A') return itemsProjectA;
      if (projectId === 'proj-B') return itemsProjectB;
      return [];
    });
  });

  it('scopes stories, sprints, and architecture strictly to the active project', async () => {
    render(
      <ToastProvider>
        <ProjectDataProvider>
          <ScopingConsumer />
        </ProjectDataProvider>
      </ToastProvider>
    );

    // Initial load defaults to Project A
    await waitFor(() => {
      expect(screen.getByTestId('active-project-id')).toHaveTextContent('proj-A');
    });

    expect(screen.getByTestId('story-count')).toHaveTextContent('2');
    expect(screen.getByText('Ledger Ingestion')).toBeInTheDocument();
    expect(screen.getByText('Account Query API')).toBeInTheDocument();
    expect(screen.queryByText('Anomaly Scoring Pipeline')).not.toBeInTheDocument();

    expect(screen.getByTestId('sprint-count')).toHaveTextContent('1');
    expect(screen.getByText('Sprint A1')).toBeInTheDocument();
    expect(screen.queryByText('Sprint B1: Fraud ML')).not.toBeInTheDocument();

    expect(screen.getByTestId('arch-pattern')).toHaveTextContent('Modular Monolith');
  });

  it('switching between two projects completely isolates and reloads project data without leaks', async () => {
    render(
      <ToastProvider>
        <ProjectDataProvider>
          <ScopingConsumer />
        </ProjectDataProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-project-id')).toHaveTextContent('proj-A');
    });

    // Switch to Project B
    const selectBtnB = screen.getByRole('button', { name: /Select Proj B/i });
    await act(async () => {
      fireEvent.click(selectBtnB);
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-project-id')).toHaveTextContent('proj-B');
    });

    // Assert Project B stories and architecture are present, Project A data is completely gone
    await waitFor(() => {
      expect(screen.getByTestId('story-count')).toHaveTextContent('1');
    });
    expect(screen.getByText('Anomaly Scoring Pipeline')).toBeInTheDocument();
    expect(screen.queryByText('Ledger Ingestion')).not.toBeInTheDocument();
    expect(screen.queryByText('Account Query API')).not.toBeInTheDocument();

    expect(screen.getByTestId('sprint-count')).toHaveTextContent('1');
    expect(screen.getByText('Sprint B1: Fraud ML')).toBeInTheDocument();
    expect(screen.queryByText('Sprint A1')).not.toBeInTheDocument();

    expect(screen.getByTestId('arch-pattern')).toHaveTextContent('Event-Driven Microservices');

    // Switch back to Project A
    const selectBtnA = screen.getByRole('button', { name: /Select Proj A/i });
    await act(async () => {
      fireEvent.click(selectBtnA);
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-project-id')).toHaveTextContent('proj-A');
    });

    await waitFor(() => {
      expect(screen.getByTestId('story-count')).toHaveTextContent('2');
    });
    expect(screen.getByText('Ledger Ingestion')).toBeInTheDocument();
    expect(screen.queryByText('Anomaly Scoring Pipeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('arch-pattern')).toHaveTextContent('Modular Monolith');
  });

  it('assigning a story to an existing sprint calls updateWorkItem with existing id and never createWorkItem', async () => {
    (api.updateWorkItem as any).mockResolvedValue({ id: 'wi-sprint-a1' });

    render(
      <ToastProvider>
        <ProjectDataProvider>
          <ScopingConsumer />
        </ProjectDataProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-project-id')).toHaveTextContent('proj-A');
    });

    const assignBtn = screen.getByRole('button', { name: /Assign Story/i });
    await act(async () => {
      fireEvent.click(assignBtn);
    });

    expect(api.updateWorkItem).toHaveBeenCalledWith(
      'proj-A',
      'wi-sprint-a1',
      expect.objectContaining({
        payload: expect.objectContaining({
          userStoryIds: expect.arrayContaining(['US-A1', 'US-A2']),
        }),
      })
    );
    expect(api.createWorkItem).not.toHaveBeenCalled();
  });
});

