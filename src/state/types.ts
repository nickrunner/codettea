export interface AgentStatus {
  id: string;
  type: 'arch' | 'solver' | 'reviewer';
  status: 'idle' | 'running' | 'completed' | 'failed';
  issueNumber?: number;
  featureName?: string;
  startTime?: number;
  endTime?: number;
  logs: string[];
  error?: string;
}

export interface FeatureState {
  name: string;
  description: string;
  branch: string;
  worktreePath: string;
  issues: number[];
  status: 'planning' | 'in-progress' | 'reviewing' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface IssueState {
  number: number;
  title: string;
  featureName: string;
  status: 'pending' | 'solving' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  attempts: number;
  assignedAgent?: string;
  prNumber?: number;
  reviewers?: string[];
}

export interface WorktreeState {
  name: string;
  path: string;
  branch: string;
  featureName: string;
  status: 'active' | 'stale' | 'archived';
  createdAt: number;
}

export interface SystemConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  apiPort: number;
  apiToken: string;
}

export interface AppState {
  config: SystemConfig;
  features: Map<string, FeatureState>;
  issues: Map<number, IssueState>;
  agents: Map<string, AgentStatus>;
  worktrees: Map<string, WorktreeState>;
  sessions: Map<string, SessionState>;
}

export interface SessionState {
  id: string;
  token: string;
  createdAt: number;
  lastAccess: number;
  clientId?: string;
}

export interface StateUpdate {
  type: 'agent' | 'feature' | 'issue' | 'worktree' | 'config' | 'session';
  action: 'create' | 'update' | 'delete';
  id: string | number;
  data: any;
}