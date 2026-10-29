import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ArchitecturePage } from '../features/artifacts/ArchitecturePage';
import { ToastProvider } from '../app/providers/ToastProvider';

// Mock useProjectData
const mockGenerateArch = vi.fn();
let currentArchitecture: any = {
  id: 'arch-1',
  projectId: 'proj-001',
  artifactVersionId: 'v1',
  title: 'Architecture Blueprint',
  summary: 'Modular Monolith recommended for core banking.',
  pattern: 'Modular Monolith',
  provider: 'rules_based',
  rationale: 'High relational integrity required; modular monolith minimizes operational overhead.',
  evidence: ['PCI-DSS compliance signal', 'Transactional banking ledger signal'],
  dataStores: [
    { type: 'Relational', technology: 'PostgreSQL 16', rationale: 'ACID transaction log' },
  ],
  resiliencePatterns: ['Database Connection Pooling', 'Circuit Breakers on External APIs'],
  components: [
    { name: 'API Gateway', role: 'Edge Routing', technology: 'Kong' },
    { name: 'Core Ledger', role: 'Transaction Processing', technology: 'FastAPI' },
  ],
  decisions: [
    {
      id: 'ADR-001',
      title: 'PostgreSQL ACID Engine',
      context: 'Ledger integrity',
      decision: 'Adopt PostgreSQL',
      consequences: 'Requires migration tooling',
    },
  ],
  securityConsiderations: ['JWT rotation', 'mTLS isolation'],
  deploymentTopology: 'Cloud Run serverless containers',
  alternatives: [
    {
      name: 'Microservices',
      rationale: 'Independent scaling',
      tradeoffs: 'High ops overhead',
    },
  ],
  assumptions: ['Cloud SQL available'],
  risks: ['Database connection saturation'],
  status: 'draft' as const,
  sourceRequirementIds: [],
  createdAt: '2026-10-29T00:00:00Z',
  updatedAt: '2026-10-29T00:00:00Z',
};

vi.mock('@/app/providers/ProjectDataProvider', () => ({
  useProjectData: () => ({
    architecture: currentArchitecture,
    generateArchitectureRecommendation: mockGenerateArch,
    isProcessing: { generateArch: false },
  }),
}));

describe('ArchitecturePage Component (Engineer 3)', () => {
  it('renders architecture pattern, components, rationale, evidence, and truthful provider badge', () => {
    render(
      <ToastProvider>
        <ArchitecturePage />
      </ToastProvider>
    );

    expect(screen.getByText('Architecture Blueprint')).toBeInTheDocument();
    expect(screen.getByText('Modular Monolith')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
    expect(screen.getByText('Core Ledger')).toBeInTheDocument();
    expect(screen.getByText('Engine: Rules-Based')).toBeInTheDocument();
    expect(screen.getByText(/High relational integrity required/i)).toBeInTheDocument();
    expect(screen.getByText('PCI-DSS compliance signal')).toBeInTheDocument();
  });

  it('renders data stores and resilience patterns when switching to datastores tab', () => {
    render(
      <ToastProvider>
        <ArchitecturePage />
      </ToastProvider>
    );

    const dataStoreTab = screen.getByText(/Data Stores & Topology/i);
    fireEvent.click(dataStoreTab);

    expect(screen.getByText('Relational Store')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL 16')).toBeInTheDocument();
    expect(screen.getByText('ACID transaction log')).toBeInTheDocument();
    expect(screen.getByText('Resilience & Fault Tolerance Patterns')).toBeInTheDocument();
    expect(screen.getByText('Database Connection Pooling')).toBeInTheDocument();
  });

  it('switches tabs and renders ADR details correctly', () => {
    render(
      <ToastProvider>
        <ArchitecturePage />
      </ToastProvider>
    );

    const adrTab = screen.getByText(/Architectural Decision Records/i);
    fireEvent.click(adrTab);

    expect(screen.getByText('ADR-001')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL ACID Engine')).toBeInTheDocument();
    expect(screen.getByText('Adopt PostgreSQL')).toBeInTheDocument();
  });

  it('clicking Synthesize Blueprint triggers generator function', () => {
    render(
      <ToastProvider>
        <ArchitecturePage />
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /Synthesize Blueprint/i });
    fireEvent.click(button);

    expect(mockGenerateArch).toHaveBeenCalled();
  });
});
