// DevPilot Enterprise API Client
// Handles authentication, JWT tokens, RBAC, and error handling

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  failed_login_count: number;
  last_login_at: string | null;
  capabilities: string[];
}

export interface ApiAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_title: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiWorkItem {
  id: string;
  project_id: string;
  record_type: string;
  title: string;
  status: string | null;
  payload: Record<string, unknown>;
  source_ids: string[];
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiArtifactVersion {
  id: string;
  artifact_id: string;
  version_number: number;
  payload: Record<string, unknown>;
  source_requirement_ids: string[];
  created_by: string;
  created_at: string;
  change_summary: string | null;
}

export interface ApiArtifact {
  id: string;
  project_id: string;
  artifact_type: string;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  current_version: ApiArtifactVersion | null;
}

export interface ApiArchitectureComponent {
  name: string;
  role: string;
  technology: string;
  responsibilities: string[];
}

export interface ApiArchitectureAlternative {
  name: string;
  rationale: string;
  tradeoffs: string;
}

export interface ApiArchitectureADR {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
}

export interface ApiArchitectureRecommendation {
  id: string;
  project_id: string;
  pattern: string;
  summary: string;
  components: ApiArchitectureComponent[];
  data_stores: Array<{ type: string; technology: string; rationale: string }>;
  security_patterns: string[];
  resilience_patterns: string[];
  deployment_topology: string;
  alternatives: ApiArchitectureAlternative[];
  adrs: ApiArchitectureADR[];
  risks: string[];
  assumptions: string[];
  rationale: string;
  evidence: string[];
  provider: string;
  mermaid_diagram: string | null;
  source_requirement_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiNormalizedStoryIn {
  id: string;
  title: string;
  priority?: string;
  description?: string;
  acceptance_criteria_count?: number;
  dependency_ids?: string[];
  risk_level?: string;
  complexity?: string;
  existing_estimate?: number | null;
}

export interface ApiStoryEstimate {
  story_id: string;
  estimated_points: number;
  rationale: string;
  confidence: string;
  assumption: string;
  retained_existing: boolean;
}

export interface ApiSprintOut {
  id: string;
  project_id: string;
  sprint_number: number;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: string;
  story_ids: string[];
  total_points: number;
  capacity: number;
  warnings: string[];
  stories: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

export interface ApiSprintPlanResponse {
  sprints: ApiSprintOut[];
  backlog: string[];
  backlog_reasons: Record<string, string>;
  estimates: ApiStoryEstimate[];
  topo_order: string[];
  critical_path: string[];
  warnings: string[];
  overflow_policy: string;
  total_sprints: number;
  total_stories_planned: number;
  total_story_points: number;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  private getAccessToken(): string | null {
    return localStorage.getItem('devpilot_access_token');
  }

  private setTokens(tokens: TokenResponse): void {
    localStorage.setItem('devpilot_access_token', tokens.access_token);
    localStorage.setItem('devpilot_refresh_token', tokens.refresh_token);
  }

  public clearTokens(): void {
    localStorage.removeItem('devpilot_access_token');
    localStorage.removeItem('devpilot_refresh_token');
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('devpilot_refresh_token');
    if (!refreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).then(async (response) => {
      if (!response.ok) return false;
      this.setTokens(await response.json() as TokenResponse);
      return true;
    }).catch(() => false).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, canRefresh = true): Promise<T> {
    const token = this.getAccessToken();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', 'Bearer ' + token);
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && canRefresh && !endpoint.endsWith('/auth/refresh')) {
      if (await this.refreshAccessToken()) {
        return this.request<T>(endpoint, options, false);
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson?.detail) {
          errorMessage = errorJson.detail;
        }
      } catch {
        // Fallback to response.statusText
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // Auth Methods
  public async login(email: string, password: string): Promise<{ tokens: TokenResponse; user: UserProfile }> {
    const tokens = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setTokens(tokens);

    // Fetch user profile with token
    const user = await this.getMe();
    return { tokens, user };
  }

  public async register(payload: { name: string; email: string; password: string; role?: string }): Promise<void> {
    await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me');
  }

  public async listProjects(): Promise<ApiProject[]> {
    return this.request<ApiProject[]>('/projects');
  }

  public async createProject(payload: { name: string; description?: string }): Promise<ApiProject> {
    return this.request<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateProject(
    projectId: string,
    payload: { name?: string; description?: string },
  ): Promise<ApiProject> {
    return this.request<ApiProject>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async listWorkItems(projectId: string, recordType?: string): Promise<ApiWorkItem[]> {
    const query = recordType ? `?record_type=${encodeURIComponent(recordType)}` : '';
    return this.request<ApiWorkItem[]>(`/projects/${projectId}/work-items${query}`);
  }

  public async createWorkItem(
    projectId: string,
    payload: {
      record_type: string;
      title: string;
      status?: string;
      payload?: Record<string, unknown>;
      source_ids?: string[];
      parent_id?: string;
    },
  ): Promise<ApiWorkItem> {
    return this.request<ApiWorkItem>(`/projects/${projectId}/work-items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateWorkItem(
    projectId: string,
    itemId: string,
    payload: {
      title?: string;
      status?: string;
      payload?: Record<string, unknown>;
      source_ids?: string[];
      parent_id?: string | null;
    },
  ): Promise<ApiWorkItem> {
    return this.request<ApiWorkItem>(`/projects/${projectId}/work-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteWorkItem(projectId: string, itemId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/work-items/${itemId}`, {
      method: 'DELETE',
    });
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearTokens();
    }
  }

  public async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    return this.request<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  // User Management Methods (Admin)
  public async listUsers(): Promise<UserProfile[]> {
    return this.request<UserProfile[]>('/auth/users');
  }

  public async provisionUser(payload: { name: string; email: string; role: string; password?: string }): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/provision', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateUserRole(userId: string, role: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/auth/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  public async updateUserStatus(userId: string, isActive: boolean): Promise<UserProfile> {
    return this.request<UserProfile>(`/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  // Audit Logs (Admin)
  public async listAuditLogs(params?: { action?: string; entity_type?: string }): Promise<ApiAuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.entity_type) query.set('entity_type', params.entity_type);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<ApiAuditLog[]>(`/audit-logs${queryString}`);
  }

  // Engineer 2 Artifact Engine Methods
  public async generateUserStories(
    projectId: string,
    payload: { title: string; requirement_ids?: string[]; query?: string; instructions?: string },
  ): Promise<ApiArtifact> {
    return this.request<ApiArtifact>(`/projects/${projectId}/artifacts/generate/user-stories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async generateAcceptanceCriteria(
    projectId: string,
    payload: { title: string; requirement_ids?: string[]; query?: string; instructions?: string },
  ): Promise<ApiArtifact> {
    return this.request<ApiArtifact>(`/projects/${projectId}/artifacts/generate/acceptance-criteria`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async generateTestCases(
    projectId: string,
    payload: { title: string; requirement_ids?: string[]; query?: string; instructions?: string },
  ): Promise<ApiArtifact> {
    return this.request<ApiArtifact>(`/projects/${projectId}/artifacts/generate/test-cases`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async generateApiSpec(
    projectId: string,
    payload: { title: string; requirement_ids?: string[]; query?: string; instructions?: string },
  ): Promise<ApiArtifact> {
    return this.request<ApiArtifact>(`/projects/${projectId}/artifacts/generate/api-spec`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async generateUnified(
    projectId: string,
    payload: { title_prefix: string; requirement_ids?: string[]; query?: string; instructions?: string },
  ): Promise<ApiArtifact[]> {
    return this.request<ApiArtifact[]>(`/projects/${projectId}/artifacts/generate/unified`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getArtifact(projectId: string, artifactId: string): Promise<ApiArtifact> {
    return this.request<ApiArtifact>(`/projects/${projectId}/artifacts/${artifactId}`);
  }

  public async listArtifactVersions(projectId: string, artifactId: string): Promise<ApiArtifactVersion[]> {
    return this.request<ApiArtifactVersion[]>(`/projects/${projectId}/artifacts/${artifactId}/versions`);
  }

  public async createArtifactVersion(
    projectId: string,
    artifactId: string,
    payload: { payload: Record<string, unknown>; source_requirement_ids?: string[]; change_summary?: string },
  ): Promise<ApiArtifactVersion> {
    return this.request<ApiArtifactVersion>(`/projects/${projectId}/artifacts/${artifactId}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Architecture Recommendation Engine
  public async recommendArchitecture(
    projectId: string,
    payload: { context?: string; requirement_ids?: string[] } = {},
  ): Promise<ApiArchitectureRecommendation> {
    return this.request<ApiArchitectureRecommendation>(`/projects/${projectId}/architecture/recommend`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getArchitecture(projectId: string): Promise<ApiArchitectureRecommendation> {
    return this.request<ApiArchitectureRecommendation>(`/projects/${projectId}/architecture`);
  }

  // Sprint Planning & Estimation Engine
  public async planSprints(
    projectId: string,
    payload: {
      stories?: ApiNormalizedStoryIn[];
      capacity_story_points?: number;
      sprint_duration_weeks?: number;
      start_date?: string;
    } = {},
  ): Promise<ApiSprintPlanResponse> {
    return this.request<ApiSprintPlanResponse>(`/projects/${projectId}/sprints/plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listSprints(projectId: string): Promise<ApiSprintOut[]> {
    return this.request<ApiSprintOut[]>(`/projects/${projectId}/sprints`);
  }

  public async updateArtifactStatus(
    projectId: string,
    artifactId: string,
    status: 'draft' | 'in_review' | 'accepted' | 'rejected',
  ): Promise<ApiArtifact> {
    return this.request<ApiArtifact>(`/projects/${projectId}/artifacts/${artifactId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const api = new ApiClient();
