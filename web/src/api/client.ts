import type { 
  SystemConfig, 
  Agent, 
  Feature, 
  Issue, 
  Worktree, 
  AuthResponse,
  ApiError 
} from '@/types';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    this.token = localStorage.getItem('auth_token');
  }

  private saveToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // Auth endpoints
  async login(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
    });
    this.saveToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async checkAuth(): Promise<boolean> {
    try {
      await this.request('/auth/check');
      return true;
    } catch {
      return false;
    }
  }

  // System endpoints
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  async getConfig(): Promise<SystemConfig> {
    return this.request('/config');
  }

  async updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async selectProject(projectName: string): Promise<{ success: boolean }> {
    return this.request('/projects/select', {
      method: 'POST',
      body: JSON.stringify({ project: projectName }),
    });
  }

  // Agent endpoints
  async getAgents(): Promise<Agent[]> {
    return this.request('/agents');
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request(`/agents/${id}`);
  }

  async stopAgent(id: string): Promise<{ success: boolean }> {
    return this.request(`/agents/${id}/stop`, { method: 'POST' });
  }

  async getAgentLogs(id: string): Promise<{ logs: string[] }> {
    return this.request(`/agents/${id}/logs`);
  }

  streamAgentLogs(
    id: string,
    onData: (log: string) => void,
    onError?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/agents/${id}/logs/stream`);
    
    eventSource.onmessage = (event) => {
      onData(event.data);
    };

    eventSource.onerror = () => {
      onError?.(new Error('Stream connection lost'));
      eventSource.close();
    };

    return () => eventSource.close();
  }

  // Feature endpoints
  async getFeatures(): Promise<Feature[]> {
    return this.request('/features');
  }

  async getFeature(id: string): Promise<Feature> {
    return this.request(`/features/${id}`);
  }

  async createFeature(data: { 
    name: string; 
    description: string 
  }): Promise<Feature> {
    return this.request('/features', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFeature(
    id: string,
    data: Partial<Feature>
  ): Promise<Feature> {
    return this.request(`/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFeature(id: string): Promise<{ success: boolean }> {
    return this.request(`/features/${id}`, { method: 'DELETE' });
  }

  async assignIssue(
    featureId: string,
    issueNumber: number
  ): Promise<{ success: boolean }> {
    return this.request(`/features/${featureId}/issues/${issueNumber}/assign`, {
      method: 'POST',
    });
  }

  async updateIssueStatus(
    featureId: string,
    issueNumber: number,
    status: Issue['status']
  ): Promise<Issue> {
    return this.request(`/features/${featureId}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Worktree endpoints
  async getWorktrees(): Promise<Worktree[]> {
    return this.request('/worktrees');
  }

  async createWorktree(data: {
    feature: string;
    branch: string;
  }): Promise<Worktree> {
    return this.request('/worktrees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWorktree(path: string): Promise<{ success: boolean }> {
    return this.request('/worktrees', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    });
  }

  async getWorktreeStatus(path: string): Promise<Worktree> {
    return this.request(`/worktrees/status?path=${encodeURIComponent(path)}`);
  }
}

export const apiClient = new ApiClient();