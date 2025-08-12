import { WorktreeInfo, WorktreeStatus, WorktreeCleanupResult } from './types';
export interface WorktreeConfig {
    mainRepoPath: string;
    baseWorktreePath: string;
    projectName: string;
}
export declare class WorktreeManager {
    private config;
    private worktreePath;
    constructor(config: WorktreeConfig, featureName: string);
    get path(): string;
    /**
     * Ensures the base branch is up to date with remote
     */
    syncBaseBranch(baseBranch: string): Promise<void>;
    /**
     * Creates or ensures feature branch exists and is up to date
     */
    ensureFeatureBranch(featureName: string, _baseBranch: string): Promise<string>;
    /**
     * Syncs feature branch with base branch to stay current
     */
    syncFeatureBranch(featureBranch: string, baseBranch: string): Promise<void>;
    /**
     * Creates worktree if it doesn't exist
     */
    ensureWorktree(targetBranch: string): Promise<void>;
    /**
     * Verifies we're working on the correct branch in the worktree
     */
    verifyWorktreeBranch(expectedBranch: string): Promise<void>;
    /**
     * Sets up feature worktree - orchestrates the setup process for regular features
     */
    setupForFeature(featureName: string, baseBranch: string, isParentFeature: boolean): Promise<void>;
    /**
     * Sets up environment specifically for architecture planning
     */
    setupForArchitecture(featureName: string, baseBranch: string): Promise<void>;
    /**
     * Checks if the worktree exists
     */
    exists(): Promise<boolean>;
    /**
     * Gets the current branch in the worktree
     */
    getCurrentBranch(): Promise<string>;
    /**
     * Runs git status in the worktree
     */
    status(): Promise<void>;
    /**
     * Creates issue-specific branch name
     */
    getIssueBranchName(featureName: string, issueNumber: number): string;
    /**
     * Gets the feature branch name (parent of issue branches)
     */
    getFeatureBranchName(featureName: string): string;
    /**
     * Sets up issue-specific branch within the feature worktree
     */
    setupIssueBranch(featureName: string, issueNumber: number): Promise<string>;
    /**
     * Commits and pushes changes for an issue
     */
    commitIssueChanges(issueNumber: number, issueTitle: string, issueBranch: string): Promise<void>;
    /**
     * Commits and pushes architecture changes
     */
    commitArchitectureChanges(featureName: string, issueNumbers: number[]): Promise<void>;
}
/**
 * Standalone utility functions for worktree management
 * These can be used without instantiating the WorktreeManager class
 */
/**
 * Gets a list of all worktrees for a repository
 */
export declare function getWorktreeList(mainRepoPath: string): Promise<WorktreeInfo[]>;
/**
 * Creates a new worktree for a feature
 */
export declare function createWorktree(featureName: string, mainRepoPath: string, baseWorktreePath: string, projectName: string): Promise<void>;
/**
 * Removes a worktree with optional force flag
 */
export declare function removeWorktree(worktreePath: string, mainRepoPath: string, force?: boolean): Promise<void>;
/**
 * Cleans up unused worktrees
 */
export declare function cleanupWorktrees(mainRepoPath: string): Promise<WorktreeCleanupResult>;
/**
 * Shows the status of a worktree
 */
export declare function showWorktreeStatus(worktreePath: string): Promise<WorktreeStatus | null>;
/**
 * Validates a worktree path
 */
export declare function validateWorktreePath(worktreePath: string): Promise<boolean>;
//# sourceMappingURL=worktreeManager.d.ts.map