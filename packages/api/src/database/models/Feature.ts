export interface FeatureModel {
  id?: number;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'archived';
  branch: string;
  worktree_path?: string;
  parent_feature_id?: number;
  architecture_mode?: boolean;
  github_project_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface FeatureWithRelations extends FeatureModel {
  issues?: IssueModel[];
  worktree?: WorktreeModel;
  parentFeature?: FeatureModel;
  childFeatures?: FeatureModel[];
}

export interface IssueModel {
  id?: number;
  number: number;
  feature_id?: number;
  title: string;
  description?: string;
  status: 'open' | 'closed' | 'in_progress';
  assignee?: string;
  labels?: string;
  github_id?: string;
  pr_number?: number;
  attempt_count?: number;
  solver_agent_id?: string;
  dependencies?: string;
  step_number?: number;
  created_at?: Date;
  updated_at?: Date;
  closed_at?: Date;
}

export interface WorktreeModel {
  id?: number;
  path: string;
  branch: string;
  feature_id?: number;
  commit?: string;
  is_main?: boolean;
  exists?: boolean;
  has_changes?: boolean;
  files_changed?: number;
  created_at?: Date;
  updated_at?: Date;
}