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

class ApiClient {
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

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
}

export const api = new ApiClient();
