import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

describe('ApiClient - Architecture and Sprint Planning (Engineer 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('recommendArchitecture calls POST /projects/:id/architecture/recommend with auth header and body', async () => {
    localStorage.setItem('devpilot_access_token', 'mock-access-token');

    const mockResponse = {
      id: 'arch-123',
      project_id: 'proj-001',
      pattern: 'Modular Monolith',
      summary: 'Architecture summary',
      components: [],
      data_stores: [],
      security_patterns: [],
      resilience_patterns: [],
      deployment_topology: 'Cloud Run',
      alternatives: [],
      adrs: [],
      risks: [],
      assumptions: [],
      rationale: 'Evidence rationale',
      evidence: ['scale'],
      provider: 'rules_based',
      mermaid_diagram: null,
      source_requirement_count: 3,
      created_at: '2026-10-29T00:00:00Z',
      updated_at: '2026-10-29T00:00:00Z',
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    } as Response);

    const result = await api.recommendArchitecture('proj-001', {
      context: 'High-throughput retail banking',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('/projects/proj-001/architecture/recommend');
    expect(options?.method).toBe('POST');
    const headers = options?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer mock-access-token');
    expect(JSON.parse(options?.body as string)).toEqual({
      context: 'High-throughput retail banking',
    });
    expect(result.pattern).toBe('Modular Monolith');
  });

  it('planSprints calls POST /projects/:id/sprints/plan and returns plan response', async () => {
    localStorage.setItem('devpilot_access_token', 'mock-access-token');

    const mockPlan = {
      sprints: [
        {
          id: 'sp-1',
          project_id: 'proj-001',
          sprint_number: 1,
          name: 'Sprint 1',
          goal: 'Core banking foundation',
          start_date: '2026-11-01',
          end_date: '2026-11-14',
          status: 'planning',
          story_ids: ['US-001'],
          total_points: 5,
          capacity: 30,
          warnings: [],
          stories: [],
          created_at: '2026-10-29T00:00:00Z',
          updated_at: '2026-10-29T00:00:00Z',
        },
      ],
      backlog: [],
      backlog_reasons: {},
      estimates: [
        {
          story_id: 'US-001',
          estimated_points: 5,
          rationale: 'Base 1 + AC',
          confidence: 'high',
          assumption: 'Standard velocity',
          retained_existing: false,
        },
      ],
      topo_order: ['US-001'],
      critical_path: ['US-001'],
      warnings: [],
      overflow_policy: 'Dedicated solo sprint for oversized stories',
      total_sprints: 1,
      total_stories_planned: 1,
      total_story_points: 5,
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockPlan,
    } as Response);

    const result = await api.planSprints('proj-001', {
      capacity_story_points: 30,
      stories: [{ id: 'US-001', title: 'Login story', priority: 'must' }],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('/projects/proj-001/sprints/plan');
    expect(options?.method).toBe('POST');
    expect(result.total_stories_planned).toBe(1);
    expect(result.sprints[0].name).toBe('Sprint 1');
  });

  it('listSprints calls GET /projects/:id/sprints', async () => {
    localStorage.setItem('devpilot_access_token', 'mock-access-token');

    const mockSprints = [
      {
        id: 'sp-1',
        project_id: 'proj-001',
        sprint_number: 1,
        name: 'Sprint 1',
        goal: 'Goal 1',
        start_date: '2026-11-01',
        end_date: '2026-11-14',
        status: 'planning',
        story_ids: ['US-001'],
        total_points: 5,
        capacity: 30,
        warnings: [],
        stories: [],
        created_at: '2026-10-29T00:00:00Z',
        updated_at: '2026-10-29T00:00:00Z',
      },
    ];

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSprints,
    } as Response);

    const result = await api.listSprints('proj-001');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('/projects/proj-001/sprints');
    expect(options?.method).toBeUndefined(); // GET defaults to undefined in RequestInit
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('sp-1');
  });
});

