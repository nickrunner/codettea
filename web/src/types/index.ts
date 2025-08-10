export interface SystemConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  projects: Project[];
  currentProject?: string;
}

export interface Project {
  name: string;
  path: string;
  description?: string;
}

export interface Agent {
  id: string;
  type: 'architecture' | 'solver' | 'reviewer';
  status: 'idle' | 'running' | 'completed' | 'failed';
  feature?: string;
  issueNumber?: number;
  startTime?: string;
  endTime?: string;
  error?: string;
  pid?: number;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  branch: string;
  worktreePath?: string;
  issues: Issue[];
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  number: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent?: string;
  attempts: number;
  maxAttempts: number;
  prNumber?: number;
  reviewers?: string[];
  dependencies?: number[];
}

export interface Worktree {
  path: string;
  branch: string;
  feature?: string;
  status: 'active' | 'inactive';
  gitStatus?: GitStatus;
  createdAt: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  untracked: string[];
  staged: string[];
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}