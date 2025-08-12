export interface ProjectModel {
  id?: number;
  name: string;
  description?: string;
  repo_path: string;
  base_worktree_path: string;
  github_repo?: string;
  base_branch?: string;
  max_concurrent_tasks?: number;
  required_approvals?: number;
  reviewer_profiles?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ConfigModel {
  id?: number;
  key: string;
  value?: string;
  description?: string;
  category?: string;
  is_secret?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface SyncLogModel {
  id?: number;
  entity_type: 'feature' | 'issue' | 'worktree' | 'project' | 'config';
  entity_id?: number;
  action: 'create' | 'update' | 'delete' | 'sync';
  source: 'local' | 'git' | 'github';
  status: 'success' | 'failure' | 'pending';
  error_message?: string;
  metadata?: string;
  created_at?: Date;
}

export interface AgentFeedbackModel {
  id?: number;
  issue_id?: number;
  agent_id: string;
  reviewer_profile?: string;
  attempt_number?: number;
  feedback?: string;
  approval_status?: 'approved' | 'rejected' | 'needs_changes';
  created_at?: Date;
}