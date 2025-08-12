-- UP
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'in_progress', 'completed', 'archived')),
  branch TEXT NOT NULL,
  worktree_path TEXT,
  parent_feature_id INTEGER,
  architecture_mode BOOLEAN DEFAULT 0,
  github_project_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_feature_id) REFERENCES features(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL UNIQUE,
  feature_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'in_progress')),
  assignee TEXT,
  labels TEXT,
  github_id TEXT,
  pr_number INTEGER,
  attempt_count INTEGER DEFAULT 0,
  solver_agent_id TEXT,
  dependencies TEXT,
  step_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS worktrees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  branch TEXT NOT NULL,
  feature_id INTEGER,
  commit TEXT,
  is_main BOOLEAN DEFAULT 0,
  exists BOOLEAN DEFAULT 1,
  has_changes BOOLEAN DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  repo_path TEXT NOT NULL,
  base_worktree_path TEXT NOT NULL,
  github_repo TEXT,
  base_branch TEXT DEFAULT 'main',
  max_concurrent_tasks INTEGER DEFAULT 2,
  required_approvals INTEGER DEFAULT 3,
  reviewer_profiles TEXT DEFAULT 'backend,frontend,devops',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  category TEXT,
  is_secret BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('feature', 'issue', 'worktree', 'project', 'config')),
  entity_id INTEGER,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'sync')),
  source TEXT NOT NULL CHECK(source IN ('local', 'git', 'github')),
  status TEXT NOT NULL CHECK(status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER,
  agent_id TEXT NOT NULL,
  reviewer_profile TEXT,
  attempt_number INTEGER,
  feedback TEXT,
  approval_status TEXT CHECK(approval_status IN ('approved', 'rejected', 'needs_changes')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_features_name ON features(name);
CREATE INDEX IF NOT EXISTS idx_issues_number ON issues(number);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_feature_id ON issues(feature_id);
CREATE INDEX IF NOT EXISTS idx_worktrees_branch ON worktrees(branch);
CREATE INDEX IF NOT EXISTS idx_worktrees_feature_id ON worktrees(feature_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_config_key ON config(key);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_issue ON agent_feedback(issue_id);

-- DOWN
-- Rollback migrations
DROP INDEX IF EXISTS idx_agent_feedback_issue;
DROP INDEX IF EXISTS idx_sync_log_entity;
DROP INDEX IF EXISTS idx_config_key;
DROP INDEX IF EXISTS idx_projects_name;
DROP INDEX IF EXISTS idx_worktrees_feature_id;
DROP INDEX IF EXISTS idx_worktrees_branch;
DROP INDEX IF EXISTS idx_issues_feature_id;
DROP INDEX IF EXISTS idx_issues_status;
DROP INDEX IF EXISTS idx_issues_number;
DROP INDEX IF EXISTS idx_features_name;
DROP INDEX IF EXISTS idx_features_status;

DROP TABLE IF EXISTS agent_feedback;
DROP TABLE IF EXISTS sync_log;
DROP TABLE IF EXISTS config;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS worktrees;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS features;