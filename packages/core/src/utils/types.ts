/**
 * Type definitions for Git worktree and branch management utilities
 */

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
  exists: boolean;
  hasChanges?: boolean;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  isMerged?: boolean;
  upstream?: string;
  lastCommit?: string;
  behind?: number;
  ahead?: number;
}

export interface CleanupOptions {
  dryRun?: boolean;
  force?: boolean;
  includeRemote?: boolean;
  skipConfirmation?: boolean;
  excludeBranches?: string[];
}

export interface WorktreeStatus {
  branch: string;
  hasChanges: boolean;
  changedFiles?: string[];
  recentCommits?: string[];
  isClean: boolean;
}

export interface BranchCleanupResult {
  deleted: string[];
  failed: string[];
  skipped: string[];
  total: number;
}

export interface WorktreeCleanupResult {
  removed: string[];
  failed: string[];
  pruned: boolean;
}