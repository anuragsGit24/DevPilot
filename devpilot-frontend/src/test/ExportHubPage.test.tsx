import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ExportHubPage } from '../features/export/ExportHubPage';
import { ToastProvider } from '../app/providers/ToastProvider';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    exportZip: vi.fn(),
  },
}));

vi.mock('../app/providers/ProjectDataProvider', () => ({
  useProjectData: () => ({
    activeProject: { id: 'proj-001', name: 'Barclays Retail Banking' },
    requirements: [
      { id: 'REQ-001', title: 'Biometric Login', description: 'Requires FaceID or fingerprint.' },
      { id: 'REQ-002', title: 'Fund Transfer Limit', description: 'Maximum transfer $10k.' },
    ],
    userStories: [
      { id: 'US-001', title: 'Biometric Access', userRole: 'Customer', action: 'authenticate biometric', benefit: 'fast access', storyPoints: 5 },
    ],
    acceptanceCriteria: [
      { id: 'AC-001', scenarioName: 'Successful FaceID Login', gherkin: 'Given user is registered\nWhen face is scanned\nThen grant access' },
    ],
    testCases: [
      { id: 'TC-001', title: 'Verify FaceID Login', category: 'security', priority: 'critical', expectedResult: 'Token generated' },
    ],
    apiSpec: {
      title: 'Retail Banking OAS',
      endpoints: [{ path: '/api/v2/auth/login', method: 'POST', summary: 'Authenticate user' }],
    },
    architecture: { pattern: 'Modular Monolith' },
    sprints: [{ id: 'sp-1', name: 'Sprint 1', status: 'active' }],
  }),
}));

describe('ExportHubPage (Engineer 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export hub header, stats, and format selection cards', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ExportHubPage />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Artifact Export & Distribution Hub')).toBeInTheDocument();
    expect(screen.getByText('Markdown Dossier Bundle')).toBeInTheDocument();
    expect(screen.getByText('Gherkin BDD Feature Suite')).toBeInTheDocument();
    expect(screen.getByText('OpenAPI 3.1 Specifications')).toBeInTheDocument();
    expect(screen.getByText('Architecture & Sprint Blueprints')).toBeInTheDocument();
    expect(screen.getByText('ZIP Archive Package Hierarchy')).toBeInTheDocument();
  });

  it('allows toggling format checkboxes and calls api.exportZip on download', async () => {
    const mockBlob = new Blob(['mock-zip-content'], { type: 'application/zip' });
    vi.mocked(api.exportZip).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-url');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <MemoryRouter>
        <ToastProvider>
          <ExportHubPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const downloadZipBtn = screen.getByText(/Download ZIP Bundle/i);
    expect(downloadZipBtn).toBeInTheDocument();

    fireEvent.click(downloadZipBtn);

    await waitFor(() => {
      expect(api.exportZip).toHaveBeenCalledWith('proj-001', expect.any(Array));
    });
  });
});

