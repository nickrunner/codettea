// API Response Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    api: boolean;
    claude: boolean;
    filesystem: boolean;
  };
}

export interface ClaudeStatus {
  connected: boolean;
  lastCheck: string;
  error?: string;
  capabilities?: {
    maxTokens: number;
    model: string;
  };
}

export interface Feature {
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed' | 'archived';
  branch: string;
  worktreePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  number: number;
  title: string;
  status: 'open' | 'closed' | 'in_progress';
  assignee?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  name: string;
  path: string;
  isActive: boolean;
  hasGit: boolean;
  currentBranch?: string;
  remoteUrl?: string;
}

export interface Config {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  claudeApiKey?: string;
  githubToken?: string;
}

export interface ProjectConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  baseBranch?: string;
}

// Request Types
export interface CreateFeatureRequest {
  name: string;
  description: string;
  architectureMode?: boolean;
}

export interface UpdateFeatureRequest {
  status?: Feature['status'];
  description?: string;
}

export interface RunFeatureTaskRequest {
  featureName: string;
  issueNumbers: number[];
}

// API Error Response
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}