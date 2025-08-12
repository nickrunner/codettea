import fs from 'fs/promises';
import path from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';
import {GitUtils} from './git';
import {MergeConflictResolver} from './mergeConflictResolver';
import {WorktreeInfo, WorktreeStatus, WorktreeCleanupResult} from './types';

const execAsync = promisify(exec);

export interface WorktreeConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  projectName: string;
}

export class WorktreeManager {
  private config: WorktreeConfig;
  private worktreePath: string;

  constructor(config: WorktreeConfig, featureName: string) {
    this.config = config;
    this.worktreePath = path.join(
      config.baseWorktreePath,
      `${config.projectName}-${featureName}`,
    );
  }

  get path(): string {
    return this.worktreePath;
  }

  /**
   * Ensures the base branch is up to date with remote
   */
  async syncBaseBranch(baseBranch: string): Promise<void> {
    console.log(`🔄 Syncing base branch: ${baseBranch}`);
    await GitUtils.checkout(baseBranch, this.config.mainRepoPath);
    await GitUtils.pull(baseBranch, this.config.mainRepoPath);
  }

  /**
   * Creates or ensures feature branch exists and is up to date
   */
  async ensureFeatureBranch(
    featureName: string,
    _baseBranch: string,
  ): Promise<string> {
    const featureBranchName = `feature/${featureName}`;
    console.log(`🌿 Ensuring feature branch: ${featureBranchName}`);

    const branchExists = await GitUtils.branchExists(
      featureBranchName,
      this.config.mainRepoPath,
    );

    if (branchExists) {
      // Check if branch is already checked out in a worktree
      const isInWorktree = await GitUtils.isBranchInWorktree(
        featureBranchName,
        this.config.mainRepoPath,
      );

      if (!isInWorktree) {
        // Branch exists but not in a worktree, checkout in main repo
        await GitUtils.checkout(featureBranchName, this.config.mainRepoPath);
        console.log(`✅ Switched to existing branch: ${featureBranchName}`);
      } else {
        console.log(
          `✅ Branch ${featureBranchName} already active in worktree`,
        );
      }
    } else {
      // Branch doesn't exist, create it
      await GitUtils.createBranch(featureBranchName, this.config.mainRepoPath);
      await GitUtils.push(featureBranchName, this.config.mainRepoPath);
      console.log(`✅ Created new branch: ${featureBranchName}`);
    }

    return featureBranchName;
  }

  /**
   * Syncs feature branch with base branch to stay current
   */
  async syncFeatureBranch(
    featureBranch: string,
    baseBranch: string,
  ): Promise<void> {
    console.log(`🔄 Syncing ${featureBranch} with ${baseBranch}`);

    // Merge base branch into feature branch (do this in the worktree if it exists)
    const mergeLocation = (await GitUtils.worktreeExists(this.worktreePath))
      ? this.worktreePath
      : this.config.mainRepoPath;

    try {
      await GitUtils.merge(baseBranch, mergeLocation);
    } catch (error: any) {
      if (error.message.includes('PARTIAL_MERGE_STATE')) {
        console.log(`⚠️ Repository in partial merge state - cleaning up first`);

        try {
          // First, try to resolve any existing conflicts in the index
          const resolved = await MergeConflictResolver.resolveMergeConflicts(
            mergeLocation,
            'cleanup',
          );

          if (resolved) {
            console.log(`✅ Resolved conflicts from partial merge state`);
          } else {
            // If resolution fails, try to abort the merge (if one exists)
            try {
              await GitUtils.abortMerge(mergeLocation);
              console.log(`🔄 Partial merge aborted`);
            } catch (abortError: any) {
              if (
                abortError.toString().includes('no merge to abort') ||
                abortError.toString().includes('MERGE_HEAD missing')
              ) {
                console.log(
                  `⚠️ No active merge to abort - cleaning index manually`,
                );
                // Reset the index to clean up any conflicted files
                await GitUtils.resetIndex(mergeLocation);
              } else {
                throw abortError;
              }
            }
          }

          console.log(`🔄 Retrying sync after cleanup`);
          // Retry the merge after cleanup
          await GitUtils.merge(baseBranch, mergeLocation);
        } catch (retryError: any) {
          if (retryError.message.includes('MERGE_CONFLICT')) {
            // Now we have fresh conflicts to resolve
            const resolved =
              await MergeConflictResolver.handleMergeConflictError(
                retryError,
                mergeLocation,
                baseBranch,
              );

            if (!resolved) {
              throw new Error(
                `Failed to resolve merge conflicts when syncing ${featureBranch} with ${baseBranch}. Manual intervention required.`,
              );
            }

            console.log(`✅ Merge conflicts resolved automatically`);
          } else {
            throw retryError;
          }
        }
      } else if (error.message.includes('MERGE_CONFLICT')) {
        console.log(
          `🔧 Merge conflicts detected - attempting automatic resolution`,
        );

        const resolved = await MergeConflictResolver.handleMergeConflictError(
          error,
          mergeLocation,
          baseBranch,
        );

        if (!resolved) {
          throw new Error(
            `Failed to resolve merge conflicts when syncing ${featureBranch} with ${baseBranch}. Manual intervention required.`,
          );
        }

        console.log(`✅ Merge conflicts resolved automatically`);
      } else {
        throw error;
      }
    }

    // Switch main repo back to base branch so we can create worktree for feature branch
    await GitUtils.checkout(baseBranch, this.config.mainRepoPath);
  }

  /**
   * Creates worktree if it doesn't exist
   */
  async ensureWorktree(targetBranch: string): Promise<void> {
    if (!(await GitUtils.worktreeExists(this.worktreePath))) {
      console.log(`🌳 Creating worktree for ${targetBranch}`);
      await GitUtils.addWorktree(
        this.worktreePath,
        targetBranch,
        this.config.mainRepoPath,
      );
    } else {
      console.log(`✅ Worktree already exists at ${this.worktreePath}`);
    }
  }

  /**
   * Verifies we're working on the correct branch in the worktree
   */
  async verifyWorktreeBranch(expectedBranch: string): Promise<void> {
    const currentBranch = await GitUtils.getCurrentBranch(this.worktreePath);
    if (currentBranch !== expectedBranch) {
      console.log(
        `🔄 Switching worktree from ${currentBranch} to ${expectedBranch}`,
      );
      await GitUtils.safeCheckout(expectedBranch, this.worktreePath);
    } else {
      console.log(`✅ Worktree is on correct branch: ${expectedBranch}`);
    }
  }

  /**
   * Sets up feature worktree - orchestrates the setup process for regular features
   */
  async setupForFeature(
    featureName: string,
    baseBranch: string,
    isParentFeature: boolean,
  ): Promise<void> {
    console.log(`🌳 Setting up worktree for feature: ${featureName}`);

    // Step 1: Sync base branch with remote
    await this.syncBaseBranch(baseBranch);

    let targetBranch = baseBranch;

    // Step 2: Create/ensure feature branch if this is a parent feature
    if (isParentFeature) {
      const featureBranch = await this.ensureFeatureBranch(
        featureName,
        baseBranch,
      );
      await this.syncFeatureBranch(featureBranch, baseBranch);
      targetBranch = featureBranch;
    }

    // Step 3: Ensure worktree exists
    await this.ensureWorktree(targetBranch);

    // Step 4: Verify we're on the correct branch
    await this.verifyWorktreeBranch(targetBranch);
  }

  /**
   * Sets up environment specifically for architecture planning
   */
  async setupForArchitecture(
    featureName: string,
    baseBranch: string,
  ): Promise<void> {
    console.log(`🏗️ Setting up worktree for architecture: ${featureName}`);

    // Step 1: Sync base branch with remote
    await this.syncBaseBranch(baseBranch);

    // Step 2: Always create/ensure feature branch for architecture
    const featureBranch = await this.ensureFeatureBranch(
      featureName,
      baseBranch,
    );
    await this.syncFeatureBranch(featureBranch, baseBranch);

    // Step 3: Ensure worktree exists for the feature branch
    await this.ensureWorktree(featureBranch);

    // Step 4: Verify we're on the correct branch in the worktree
    await this.verifyWorktreeBranch(featureBranch);

    // Step 5: Initialize architecture tracking files
    const claudeDir = path.join(this.worktreePath, '.codettea', featureName);
    await fs.mkdir(claudeDir, {recursive: true});
    await fs.writeFile(path.join(claudeDir, 'ARCHITECTURE_NOTES.md'), '', {
      flag: 'a',
    });
    await fs.writeFile(path.join(claudeDir, 'CHANGELOG.md'), '', {flag: 'a'});

    console.log(`🏗️ Architecture environment ready on ${featureBranch}`);
  }

  /**
   * Checks if the worktree exists
   */
  async exists(): Promise<boolean> {
    return GitUtils.worktreeExists(this.worktreePath);
  }

  /**
   * Gets the current branch in the worktree
   */
  async getCurrentBranch(): Promise<string> {
    return GitUtils.getCurrentBranch(this.worktreePath);
  }

  /**
   * Runs git status in the worktree
   */
  async status(): Promise<void> {
    return GitUtils.status(this.worktreePath);
  }

  // Issue-specific operations within the shared feature worktree

  /**
   * Creates issue-specific branch name
   */
  getIssueBranchName(featureName: string, issueNumber: number): string {
    return `feature/${featureName}-issue-${issueNumber}`;
  }

  /**
   * Gets the feature branch name (parent of issue branches)
   */
  getFeatureBranchName(featureName: string): string {
    return `feature/${featureName}`;
  }

  /**
   * Sets up issue-specific branch within the feature worktree
   */
  async setupIssueBranch(
    featureName: string,
    issueNumber: number,
  ): Promise<string> {
    const issueBranch = this.getIssueBranchName(featureName, issueNumber);
    const currentBranch = await GitUtils.getCurrentBranch(this.worktreePath);

    if (currentBranch !== issueBranch) {
      const branchExists = await GitUtils.verifyBranch(
        issueBranch,
        this.worktreePath,
      );
      if (branchExists) {
        console.log(`🔄 Switching to existing issue branch: ${issueBranch}`);
        await GitUtils.safeCheckout(issueBranch, this.worktreePath);
      } else {
        console.log(`🌿 Creating new issue branch: ${issueBranch}`);
        await GitUtils.createBranch(issueBranch, this.worktreePath);
      }
    } else {
      console.log(`✅ Already on issue branch: ${issueBranch}`);
    }

    return issueBranch;
  }

  /**
   * Commits and pushes changes for an issue
   */
  async commitIssueChanges(
    issueNumber: number,
    issueTitle: string,
    issueBranch: string,
  ): Promise<void> {
    console.log(`📝 Committing changes for issue #${issueNumber}`);

    // Add all changed files including untracked ones
    await GitUtils.addFiles('.', this.worktreePath);

    // Ensure architecture notes are included for reviewer context (even if unchanged)
    try {
      await GitUtils.addFiles('.codettea/', this.worktreePath);
      console.log(`📋 Included architecture context for reviewers`);
    } catch (error) {
      // Architecture files may not exist for non-architecture workflows
      console.log(`⚠️ No architecture context to include: ${error}`);
    }

    // Check if there are actually changes to commit
    try {
      const commitMessage = `feat(#${issueNumber}): ${issueTitle}\n\nCloses #${issueNumber}`;
      await GitUtils.commit(commitMessage, this.worktreePath);

      // Force push to ensure the branch is on remote
      console.log(`🚀 Pushing ${issueBranch} to remote`);
      await GitUtils.push(issueBranch, this.worktreePath);

      console.log(
        `✅ Successfully committed and pushed changes for issue #${issueNumber}`,
      );
    } catch (error: any) {
      let errorString = '';
      try {
        errorString = JSON.stringify(error);
      } catch (err) {
        errorString = '';
      }
      if (
        error.toString().includes('nothing to commit') ||
        error.stdout.toString().includes('nothing to commit') ||
        errorString.includes('no changes added to commit')
      ) {
        console.log(
          `⚠️ No changes to commit for issue #${issueNumber} - solver may have just analyzed existing code`,
        );
        console.log(
          `💡 This could mean the feature is already implemented or the solver needs clearer instructions`,
        );
        // Don't throw - this isn't necessarily a failure, just log it
        return;
      }
      throw error;
    }
  }

  /**
   * Commits and pushes architecture changes
   */
  async commitArchitectureChanges(
    featureName: string,
    issueNumbers: number[],
  ): Promise<void> {
    console.log(`📝 Committing architecture changes for ${featureName}`);

    await GitUtils.addFiles('.codettea/', this.worktreePath);
    const commitMessage = `arch: initialize ${featureName} architecture\n\n- Created architecture notes and planning documents\n- Defined task breakdown and dependencies\n- Setup GitHub project and issues\n- Ready for multi-agent implementation\n\nIssues created: ${issueNumbers.join(
      ', ',
    )}`;
    await GitUtils.commit(commitMessage, this.worktreePath);
    await GitUtils.push(`feature/${featureName}`, this.worktreePath);
  }
}

/**
 * Standalone utility functions for worktree management
 * These can be used without instantiating the WorktreeManager class
 */

/**
 * Gets a list of all worktrees for a repository
 */
export async function getWorktreeList(
  mainRepoPath: string,
): Promise<WorktreeInfo[]> {
  try {
    const {stdout} = await execAsync('git worktree list --porcelain', {
      cwd: mainRepoPath,
    });

    const worktrees: WorktreeInfo[] = [];
    const lines = stdout.split('\n');
    let currentWorktree: Partial<WorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          // Check if this is the main worktree before pushing
          if (currentWorktree.path === mainRepoPath) {
            currentWorktree.isMain = true;
          }
          worktrees.push(currentWorktree as WorktreeInfo);
        }
        currentWorktree = {
          path: line.substring(9),
          isMain: false,
          exists: true,
        };
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.commit = line.substring(5);
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7);
      } else if (line === 'bare') {
        currentWorktree.isMain = true;
      }
    }

    if (currentWorktree.path) {
      // Check if this is the main worktree
      if (currentWorktree.path === mainRepoPath) {
        currentWorktree.isMain = true;
      }
      worktrees.push(currentWorktree as WorktreeInfo);
    }

    return worktrees;
  } catch (error) {
    console.error('Failed to get worktree list:', error);
    return [];
  }
}

/**
 * Creates a new worktree for a feature
 */
export async function createWorktree(
  featureName: string,
  mainRepoPath: string,
  baseWorktreePath: string,
  projectName: string,
): Promise<void> {
  const branchName = `feature/${featureName}`;
  const worktreePath = path.join(
    baseWorktreePath,
    `${projectName}-${featureName}`,
  );

  // Check if branch exists locally
  const branchExists = await GitUtils.branchExists(branchName, mainRepoPath);

  if (branchExists) {
    // Branch exists, just checkout
    await GitUtils.checkout(branchName, mainRepoPath);
  } else {
    // Branch doesn't exist, create it
    await GitUtils.createBranch(branchName, mainRepoPath);
  }

  // Create worktree
  await GitUtils.addWorktree(worktreePath, branchName, mainRepoPath);

  console.log(`✅ Created worktree: ${worktreePath}`);
  console.log(`🌿 Branch: ${branchName}`);
}

/**
 * Removes a worktree with optional force flag
 */
export async function removeWorktree(
  worktreePath: string,
  mainRepoPath: string,
  force = false,
): Promise<void> {
  const command = force
    ? `git worktree remove --force ${worktreePath}`
    : `git worktree remove ${worktreePath}`;

  await execAsync(command, {cwd: mainRepoPath});
}

/**
 * Cleans up unused worktrees
 */
export async function cleanupWorktrees(
  mainRepoPath: string,
): Promise<WorktreeCleanupResult> {
  const result: WorktreeCleanupResult = {
    removed: [],
    failed: [],
    pruned: false,
  };

  try {
    const {stdout} = await execAsync('git worktree prune', {
      cwd: mainRepoPath,
    });
    result.pruned = true;

    if (stdout.trim()) {
      // Parse pruned worktrees from output if any
      const lines = stdout.split('\n').filter(line => line.trim());
      result.removed = lines;
    }
  } catch (error) {
    console.error('Failed to cleanup worktrees:', error);
  }

  return result;
}

/**
 * Shows the status of a worktree
 */
export async function showWorktreeStatus(
  worktreePath: string,
): Promise<WorktreeStatus | null> {
  try {
    const {stdout: statusOutput} = await execAsync('git status --short', {
      cwd: worktreePath,
    });
    const {stdout: branchOutput} = await execAsync(
      'git branch --show-current',
      {
        cwd: worktreePath,
      },
    );

    const hasChanges = statusOutput.trim().length > 0;
    const changedFiles = hasChanges
      ? statusOutput.split('\n').filter(line => line.trim())
      : [];

    // Get recent commits
    const {stdout: logOutput} = await execAsync('git log --oneline -5', {
      cwd: worktreePath,
    });
    const recentCommits = logOutput.split('\n').filter(line => line.trim());

    return {
      branch: branchOutput.trim(),
      hasChanges,
      changedFiles,
      recentCommits,
      isClean: !hasChanges,
    };
  } catch (error) {
    console.error('Could not access worktree:', error);
    return null;
  }
}

/**
 * Validates a worktree path
 */
export async function validateWorktreePath(
  worktreePath: string,
): Promise<boolean> {
  try {
    await fs.access(worktreePath);
    const {stdout} = await execAsync('git rev-parse --git-dir', {
      cwd: worktreePath,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
