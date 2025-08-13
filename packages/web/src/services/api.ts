import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import type {
  HealthStatus,
  ClaudeStatus,
  Feature,
  Issue,
  Project,
  Config,
  CreateFeatureRequest,
  UpdateFeatureRequest,
  RunFeatureTaskRequest,
  ApiError,
} from '@/types/api';

class ApiClient {
  private client: AxiosInstance;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth headers if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retry?: number };

        if (!config || !this.shouldRetry(error)) {
          return Promise.reject(this.formatError(error));
        }

        config._retry = config._retry || 0;

        if (config._retry >= this.retryCount) {
          return Promise.reject(this.formatError(error));
        }

        config._retry += 1;

        await this.delay(this.retryDelay * config._retry);

        return this.client(config);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors or 5xx server errors
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === 'ECONNABORTED'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatError(error: AxiosError): ApiError {
    if (error.response?.data) {
      const data = error.response.data as { message?: string; code?: string; details?: unknown };
      return {
        message: data.message || error.message,
        code: data.code || error.code,
        details: data.details,
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: error.code,
    };
  }

  // Health endpoints
  async getHealth(): Promise<HealthStatus> {
    const response = await this.client.get<HealthStatus>('/health');
    return response.data;
  }

  // Claude endpoints
  async getClaudeStatus(): Promise<ClaudeStatus> {
    const response = await this.client.get<ClaudeStatus>('/claude/status');
    return response.data;
  }

  async testClaudeConnection(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(
      '/claude/test'
    );
    return response.data;
  }

  // Features endpoints
  async getFeatures(): Promise<Feature[]> {
    const response = await this.client.get<Feature[]>('/features');
    return response.data;
  }

  async getFeature(name: string): Promise<Feature> {
    const response = await this.client.get<Feature>(`/features/${name}`);
    return response.data;
  }

  async createFeature(data: CreateFeatureRequest): Promise<Feature> {
    const response = await this.client.post<Feature>('/features', data);
    return response.data;
  }

  async updateFeature(name: string, data: UpdateFeatureRequest): Promise<Feature> {
    const response = await this.client.patch<Feature>(`/features/${name}`, data);
    return response.data;
  }

  async deleteFeature(name: string): Promise<void> {
    await this.client.delete(`/features/${name}`);
  }

  async getFeatureIssues(name: string): Promise<Issue[]> {
    const response = await this.client.get<Issue[]>(`/features/${name}/issues`);
    return response.data;
  }

  async runFeatureTask(data: RunFeatureTaskRequest): Promise<{ taskId: string }> {
    const response = await this.client.post<{ taskId: string }>(
      '/features/run-task',
      data
    );
    return response.data;
  }

  // Projects endpoints
  async getProjects(): Promise<Project[]> {
    const response = await this.client.get<Project[]>('/projects');
    return response.data;
  }

  async getSelectedProject(): Promise<{ selectedProject: string | null }> {
    const response = await this.client.get<{ selectedProject: string | null }>('/projects/selected');
    return response.data;
  }

  async selectProject(name: string): Promise<{ success: boolean; message: string; project?: Project }> {
    const response = await this.client.post<{ success: boolean; message: string; project?: Project }>(
      `/projects/${name}/select`
    );
    return response.data;
  }

  async getProjectConfig(name: string): Promise<Config> {
    const response = await this.client.get<Config>(`/projects/${name}/config`);
    return response.data;
  }

  async updateProjectConfig(name: string, config: Partial<Config>): Promise<Config> {
    const response = await this.client.put<Config>(`/projects/${name}/config`, config);
    return response.data;
  }

  async scanProjects(): Promise<Project[]> {
    const response = await this.client.post<Project[]>('/projects/scan');
    return response.data;
  }

  async setActiveProject(name: string): Promise<Project> {
    const response = await this.client.post<Project>(`/projects/${name}/activate`);
    return response.data;
  }

  // Config endpoints
  async getConfig(): Promise<Config> {
    const response = await this.client.get<Config>('/config');
    return response.data;
  }

  async updateConfig(config: Partial<Config>): Promise<Config> {
    const response = await this.client.patch<Config>('/config', config);
    return response.data;
  }

  async validateConfig(): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await this.client.post<{ valid: boolean; errors?: string[] }>(
      '/config/validate'
    );
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();