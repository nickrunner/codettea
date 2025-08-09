import fs from 'fs/promises';
import path from 'path';
import {GitUtils} from './git';
import {MergeConflictResolver} from './mergeConflictResolver';

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
      if (error.message.includes('MERGE_CONFLICT')) {
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
      if (error.toString().includes('nothing to commit')) {
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
