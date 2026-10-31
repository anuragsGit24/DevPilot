import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TraceabilityPage } from '../features/traceability/TraceabilityPage';
import { ToastProvider } from '../app/providers/ToastProvider';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getTraceabilityMatrix: vi.fn(),
  },
}));

vi.mock('../app/providers/ProjectDataProvider', () => ({
  useProjectData: () => ({
    activeProject: { id: 'proj-001', name: 'Barclays Retail Banking' },
    requirements: [
      { id: 'REQ-001', title: 'Biometric Access', priority: 'must', category: 'security' },
      { id: 'REQ-002', title: 'Fraud Monitoring', priority: 'should', category: 'compliance' },
    ],
    userStories: [
      { id: 'US-001', title: 'Customer FaceID', sourceRequirementIds: ['REQ-001'], storyPoints: 5 },
    ],
    acceptanceCriteria: [
      { id: 'AC-001', scenarioName: 'FaceID verification', userStoryId: 'US-001' },
    ],
    testCases: [
      { id: 'TC-001', title: 'Verify FaceID lock', acceptanceCriteriaId: 'AC-001' },
    ],
    apiSpec: {
      endpoints: [
        { path: '/api/v2/auth/login', method: 'POST', tags: ['REQ-001', 'US-001'] },
      ],
    },
  }),
}));

describe('TraceabilityPage (Engineer 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders traceability matrix table, metrics, and requirement links', async () => {
    vi.mocked(api.getTraceabilityMatrix).mockResolvedValue({
      links: [
        {
          requirement_id: 'REQ-001',
          requirement_title: 'Biometric Access',
          story_ids: ['US-001'],
          criteria_ids: ['AC-001'],
          test_case_ids: ['TC-001'],
          spec_endpoints: ['POST /api/v2/auth/login'],
          coverage_score: 100,
        },
      ],
      orphaned_requirements: [],
      speculative_stories: [],
      coverage_score: 100,
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <TraceabilityPage />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Bi-Directional Traceability Matrix')).toBeInTheDocument();
    expect(screen.getByText('Overall Traceability')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeInTheDocument();
      expect(screen.getByText('US-001')).toBeInTheDocument();
      expect(screen.getByText('AC-001')).toBeInTheDocument();
      expect(screen.getByText('TC-001')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  it('supports search filtering across requirement and story IDs', async () => {
    vi.mocked(api.getTraceabilityMatrix).mockResolvedValue({
      links: [
        {
          requirement_id: 'REQ-001',
          requirement_title: 'Biometric Access',
          story_ids: ['US-001'],
          criteria_ids: ['AC-001'],
          test_case_ids: ['TC-001'],
          spec_endpoints: ['POST /api/v2/auth/login'],
          coverage_score: 100,
        },
        {
          requirement_id: 'REQ-002',
          requirement_title: 'Fraud Alert Engine',
          story_ids: [],
          criteria_ids: [],
          test_case_ids: [],
          spec_endpoints: [],
          coverage_score: 0,
        },
      ],
      orphaned_requirements: ['REQ-002'],
      speculative_stories: [],
      coverage_score: 50,
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <TraceabilityPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeInTheDocument();
      expect(screen.getAllByText('REQ-002').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search requirement, story ID/i);
    fireEvent.change(searchInput, { target: { value: 'Fraud' } });

    expect(screen.queryByText('Biometric Access')).not.toBeInTheDocument();
    expect(screen.getByText('Fraud Alert Engine')).toBeInTheDocument();
  });
});
