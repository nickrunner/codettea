#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import {GitHubUtils} from './utils/github';
import {ClaudeUtils} from './utils/claude';
import {WorktreeManager} from './utils/worktreeManager';

interface IssueTask {
  issueNumber: number;
  title: string;
  description: string;
  dependencies: number[]; // Other issue numbers this depends on
  requiredReviewers: string[]; // Specific reviewers needed for this issue
  status:
    | 'pending'
    | 'solving'
    | 'reviewing'
    | 'approved'
    | 'rejected'
    | 'completed';
  attempts: number;
  maxAttempts: number;
  reviewHistory: TaskReview[];
  worktreePath?: string;
  branch?: string;
  prNumber?: number;
}

interface TaskReview {
  reviewerId: string;
  result: 'APPROVE' | 'REJECT';
  comments: string;
  timestamp: number;
  prNumber?: number;
}

interface FeatureSpec {
  name: string;
  description: string;
  baseBranch: string; // Usually 'main'/'master' or 'feature/feature-name'
  issues?: number[]; // GitHub issue numbers (optional for arch mode)
  isParentFeature: boolean; // True if this creates a feature branch, false if working on existing feature
  architectureMode: boolean; // True if we need to run architecture phase first
}

class MultiAgentFeatureOrchestrator {
  private tasks: Map<number, IssueTask> = new Map();
  private config: {
    mainRepoPath: string;
    baseWorktreePath: string;
    maxConcurrentTasks: number;
    requiredApprovals: number;
    reviewerProfiles: string[];
  };
  private worktreeManager: WorktreeManager;
  private featureName: string;
  private projectName: string;
  private signalHandlersRegistered = false;

  constructor(
    config: MultiAgentFeatureOrchestrator['config'],
    featureName: string,
    projectName?: string,
  ) {
    this.config = config;
    this.featureName = featureName;
    this.projectName = projectName || path.basename(config.mainRepoPath);
    this.worktreeManager = new WorktreeManager(
      {
        mainRepoPath: config.mainRepoPath,
        baseWorktreePath: config.baseWorktreePath,
        projectName: this.projectName,
      },
      featureName,
    );
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    if (this.signalHandlersRegistered) return;

    const cleanup = () => {
      console.log('\n🛑 Received interrupt signal - exiting gracefully...');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    this.signalHandlersRegistered = true;
  }

  async executeFeature(spec: FeatureSpec): Promise<void> {
    console.log(`🚀 Starting multi-agent feature development: ${spec.name}`);
    console.log(`📁 Main repo: ${this.config.mainRepoPath}`);
    console.log(`📁 Worktree will be: ${this.worktreeManager.path}`);

    try {
      // Architecture phase (if needed)
      if (spec.architectureMode) {
        const issues = await this.architectFeature(spec);
        spec.issues = issues;
      } else {
        await this.worktreeManager.setupForFeature(
          this.featureName,
          spec.baseBranch,
          spec.isParentFeature,
        );
      }

      if (!spec.issues || spec.issues.length === 0) {
        throw new Error(
          'No issues to process. Either provide issue numbers or use --arch mode.',
        );
      }

      // Load and initialize tasks from GitHub issues
      await this.initializeTasksFromIssues(spec.issues);

      // Execute task dependency graph
      await this.executeTasks();

      // Create final feature PR if this is a parent feature and all issues are completed
      if (spec.isParentFeature && this.allTasksCompleted()) {
        await this.createFeaturePR(spec);
      }

      console.log(`✅ Feature ${spec.name} completed successfully!`);
    } catch (error) {
      console.error(`❌ Feature ${spec.name} failed:`, error);
      throw error;
    }
  }

  private async initializeTasksFromIssues(
    issueNumbers: number[],
  ): Promise<void> {
    console.log(`📋 Loading ${issueNumbers.length} GitHub issues as tasks`);

    for (const issueNumber of issueNumbers) {
      const issueData = await GitHubUtils.getIssue(
        issueNumber,
        this.config.mainRepoPath,
      );
      // Check if there's already a PR for this issue
      const existingPR = await GitHubUtils.findPRForIssue(
        issueData.number,
        this.config.mainRepoPath,
      );

      const task: IssueTask = {
        issueNumber,
        title: issueData.title,
        description: issueData.body,
        dependencies: this.parseDependencies(issueData.body),
        requiredReviewers: this.parseRequiredReviewers(issueData.body),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        reviewHistory: [],
        worktreePath: this.worktreeManager.path,
        prNumber: existingPR ?? undefined,
      };

      this.tasks.set(issueNumber, task);
    }
  }

  private parseDependencies(issueBody: string): number[] {
    // Look for "Depends on #123" or "Blocked by #456" patterns
    const dependencyRegex = /(?:depends on|blocked by)\s+#(\d+)/gi;
    const matches = Array.from(issueBody.matchAll(dependencyRegex));
    return matches.map(match => parseInt(match[1]));
  }

  private parseRequiredReviewers(issueBody: string): string[] {
    // Look for reviewer specifications with various formatting
    const reviewerPatterns = [
      // Standard format: "This issue requires: quick"
      /(?:\*\*)?(?:This issue requires?|Reviewers? Required?)(?:\*\*)?\s*:\s*([a-zA-Z,\s]+?)(?:\n|$)/i,
      // Markdown format: "**This issue requires**: quick"
      /\*\*This issue requires?\*\*\s*:\s*([a-zA-Z,\s]+?)(?:\n|$)/i,
      // Multi-line format: "Reviewers Required\nThis issue requires: quick"
      /Reviewers?\s+Required[:\s]*\n\s*(?:\*\*)?(?:This issue requires?)?(?:\*\*)?\s*:?\s*([a-zA-Z,\s]+?)(?:\n|$)/i,
    ];

    for (const pattern of reviewerPatterns) {
      const match = issueBody.match(pattern);
      if (match) {
        // Parse comma-separated reviewer list and clean up
        const reviewersText = match[1].trim();
        const reviewers = reviewersText
          .split(',')
          .map(r => r.trim().toLowerCase())
          .filter(r => r.length > 0 && /^[a-zA-Z-]+$/.test(r)); // Only allow valid reviewer names

        if (reviewers.length > 0) {
          console.log(`📋 Issue specifies reviewers: ${reviewers.join(', ')}`);
          return reviewers;
        }
      }
    }

    // Fallback to all reviewers if not specified
    console.log(
      `📋 No specific reviewers found, using default: ${this.config.reviewerProfiles.join(
        ', ',
      )}`,
    );
    return this.config.reviewerProfiles;
  }

  private async executeTasks(): Promise<void> {
    const activeTasks = new Set<number>();

    while (this.hasIncompleteTasks()) {
      const readyTasks = this.getReadyTasks().filter(
        task =>
          !activeTasks.has(task.issueNumber) &&
          activeTasks.size < this.config.maxConcurrentTasks,
      );

      for (const task of readyTasks) {
        activeTasks.add(task.issueNumber);
        this.executeTask(task).finally(() =>
          activeTasks.delete(task.issueNumber),
        );
      }

      await this.sleep(2000);
    }
  }

  private async executeTask(task: IssueTask): Promise<void> {
    console.log(`📋 Executing task: #${task.issueNumber} - ${task.title}`);

    try {
      // Solve the task if there's no existing PR or we have review feedback to address
      if (!task.prNumber || task.reviewHistory.length > 0) {
        task.status = 'solving';
        task.attempts++;
        await this.solveTask(task);
      }
      // Review process with rev.md workflow
      const approved = await this.reviewTask(task);
      await this.completeTask(task, approved);
    } catch (error) {
      task.status = 'rejected';
      console.error(`❌ Task failed: #${task.issueNumber}`, error);
      throw error;
    }
  }

  private async completeTask(
    task: IssueTask,
    approved: boolean,
  ): Promise<void> {
    if (approved) {
      console.log(
        `🎉 Task #${task.issueNumber} approved - starting completion workflow`,
      );

      // Step 1: Merge the PR
      if (task.prNumber) {
        try {
          await GitHubUtils.mergePR(
            task.prNumber,
            this.worktreeManager.path,
            'squash', // Use squash merge for cleaner history
          );
          console.log(`✅ PR #${task.prNumber} merged successfully`);
        } catch (error) {
          console.error(`❌ Failed to merge PR #${task.prNumber}: ${error}`);
          throw error;
        }
      }

      // Step 2: Close the issue (after successful merge)
      try {
        await GitHubUtils.closeIssue(
          task.issueNumber,
          '✅ Completed by multi-agent system - PR merged successfully',
          this.config.mainRepoPath,
        );
        console.log(`✅ Issue #${task.issueNumber} closed`);
      } catch (error) {
        console.error(
          `❌ Failed to close issue #${task.issueNumber}: ${error}`,
        );
        throw error;
      }

      // Step 3: Cleanup - handle branch deletion carefully in worktree environment
      try {
        // Get the actual branch name from the PR
        const branchName = await GitHubUtils.getPRBranchName(
          task.prNumber!,
          this.worktreeManager.path,
        );
        console.log(`🧹 Starting cleanup for branch: ${branchName}`);

        // Try to delete the branch (remote first, then local)
        // This handles cases where gh pr merge --delete-branch failed
        await GitHubUtils.deleteBranch(
          branchName,
          this.config.mainRepoPath, // Use main repo for branch operations
          true, // Delete remote branch
        );
        console.log(`🗑️ Successfully cleaned up branch: ${branchName}`);
      } catch (error) {
        // Branch cleanup is non-critical, log but don't fail the task
        console.log(`⚠️ Branch cleanup completed with warnings: ${error}`);
        console.log(
          `💡 Note: Branch may have been already deleted during PR merge`,
        );
      }

      task.status = 'completed';
      console.log(
        `🎯 Task #${task.issueNumber} fully completed: PR merged, issue closed, branch cleaned up`,
      );
    } else {
      task.status = 'rejected';
      if (task.attempts < task.maxAttempts) {
        console.log(
          `🔄 Retrying task: #${task.issueNumber} (attempt ${task.attempts}/${task.maxAttempts})`,
        );
        task.status = 'pending';
        task.reviewHistory = [];
      } else {
        throw new Error(
          `Task failed after ${task.maxAttempts} attempts: #${task.issueNumber}`,
        );
      }
    }
  }

  private async solveTask(task: IssueTask): Promise<void> {
    console.log(`🤖 Calling solver agent for issue #${task.issueNumber}`);

    // Read our custom solve.md prompt template
    const solvePromptTemplate = await fs.readFile(
      path.join(__dirname, 'prompts/solve.md'),
      'utf-8',
    );

    // Load issue details for context
    const issueData = await GitHubUtils.getIssue(
      task.issueNumber,
      this.config.mainRepoPath,
    );
    const issueDetails = `#${task.issueNumber}: ${issueData.title}\n\n${issueData.body}`;

    // Load architecture context if available
    const architectureContextPath = path.join(
      this.worktreeManager.path,
      '.codettea',
      this.featureName,
      'ARCHITECTURE_NOTES.md',
    );

    // Setup issue-specific branch within the feature worktree
    const issueBranch = await this.worktreeManager.setupIssueBranch(
      this.featureName,
      task.issueNumber,
    );

    // Customize the prompt with task-specific variables
    const solvePrompt = ClaudeUtils.customizePromptTemplate(
      solvePromptTemplate,
      {
        ISSUE_NUMBER: task.issueNumber.toString(),
        FEATURE_NAME: this.featureName,
        ATTEMPT_NUMBER: task.attempts.toString(),
        MAX_ATTEMPTS: task.maxAttempts.toString(),
        AGENT_ID: `solver-${Date.now()}`,
        WORKTREE_PATH: this.worktreeManager.path,
        BASE_BRANCH: await this.worktreeManager.getCurrentBranch(),
        ISSUE_DETAILS: issueDetails,
        ARCHITECTURE_CONTEXT: architectureContextPath,
      },
    );

    // Add context about previous failures if retrying
    const contextualPrompt =
      task.attempts > 1
        ? `${solvePrompt}\n\n**PREVIOUS ATTEMPT FEEDBACK:**\n${this.getPreviousFailureFeedback(
            task,
          )}`
        : solvePrompt;

    // Save solver prompt as reference material alongside architecture notes
    await this.saveSolverPromptReference(task, contextualPrompt);

    // Call Claude Code agent in the worktree
    await ClaudeUtils.executeAgent(
      contextualPrompt,
      'solver',
      this.worktreeManager.path,
    );

    // Commit changes and push to remote
    try {
      await this.worktreeManager.commitIssueChanges(
        task.issueNumber,
        issueData.title,
        issueBranch,
      );
    } catch (gitError) {
      console.error(`⚠️  Failed to commit or push changes: ${gitError}`);
      throw gitError;
    }

    // Create PR for the issue
    const prTitle = `feat(#${task.issueNumber}): ${issueData.title}`;
    const prBody = `## Issue\nCloses #${
      task.issueNumber
    }\n\n## Changes\n- Automated changes for issue #${
      task.issueNumber
    }\n\n## Testing\n- [ ] Tests pass\n- [ ] Linting passes\n- [ ] Build passes\n\n## Review Notes\nThis PR is part of multi-agent feature development for ${
      this.featureName
    }.\nPlease review for code quality, type safety, and architectural consistency.\n\nAgent: solver-${Date.now()} | Attempt: ${
      task.attempts
    }`;
    // PR should be created from issue branch to feature branch
    const targetBranch = this.worktreeManager.getFeatureBranchName(
      this.featureName,
    );
    const prNumber = await GitHubUtils.createPR(
      prTitle,
      prBody,
      targetBranch,
      this.worktreeManager.path,
    );

    // Capture PR number and current branch
    task.prNumber = prNumber || (await this.getLatestPRNumber());
    task.branch = await this.worktreeManager.getCurrentBranch();
  }

  private getPreviousFailureFeedback(task: IssueTask): string {
    return task.reviewHistory
      .filter(review => review.result === 'REJECT')
      .map(review => `- ${review.reviewerId}: ${review.comments}`)
      .join('\n');
  }

  private async reviewTask(task: IssueTask): Promise<boolean> {
    if (!task.prNumber) {
      throw new Error(`No PR created for task #${task.issueNumber}`);
    }

    console.log(
      `🔍 Reviewing PR #${task.prNumber} for task #${task.issueNumber}`,
    );
    task.status = 'reviewing';

    // Create shared prompt file for all reviewers
    const sharedPromptFile = await this.createSharedReviewerPrompt(task);

    try {
      // Get reviews from task-specific reviewers in parallel
      const reviewPromises = [];
      for (let i = 0; i < task.requiredReviewers.length; i++) {
        const reviewerProfile = task.requiredReviewers[i];
        reviewPromises.push(
          this.getReviewFromAgent(
            task,
            reviewerProfile,
            `reviewer-${i}`,
            sharedPromptFile,
          ),
        );
      }

      const reviews = await Promise.all(reviewPromises);

      // Add all reviews to history
      reviews.forEach(review => task.reviewHistory.push(review));

      const approvals = reviews.filter(r => r.result === 'APPROVE').length;
      const requiredApprovals = task.requiredReviewers.length;
      console.log(`📊 Reviews: ${approvals}/${requiredApprovals} approved`);
      return approvals === requiredApprovals;
    } catch (error) {
      console.error(
        `❌ Review process failed for task #${task.issueNumber}:`,
        error,
      );
      throw new Error(
        `Review process failed for task #${task.issueNumber}: ${error}`,
      );
    }
  }

  private async createSharedReviewerPrompt(task: IssueTask): Promise<string> {
    // Read our custom review.md prompt template
    const revPromptTemplate = await fs.readFile(
      path.join(__dirname, 'prompts/review.md'),
      'utf-8',
    );

    // Customize the prompt with task-specific variables (without reviewer-specific info)
    const revPrompt = ClaudeUtils.customizePromptTemplate(revPromptTemplate, {
      PR_NUMBER: task.prNumber!.toString(),
      ISSUE_NUMBER: task.issueNumber.toString(),
      FEATURE_NAME: this.featureName,
      REVIEWER_PROFILE: 'REVIEWER_PROFILE_PLACEHOLDER', // Will be replaced by each reviewer
      AGENT_ID: 'AGENT_ID_PLACEHOLDER', // Will be replaced by each reviewer
      WORKTREE_PATH: this.worktreeManager.path,
      ATTEMPT_NUMBER: task.attempts.toString(),
      PROFILE_SPECIFIC_CONTENT: 'PROFILE_SPECIFIC_CONTENT_PLACEHOLDER', // Will be replaced by each reviewer
    });

    // Save shared reviewer prompt as reference material
    const sharedPromptFile = path.join(
      this.worktreeManager.path,
      '.codettea',
      this.featureName,
      `reviewer-shared-issue-${task.issueNumber}-attempt-${task.attempts}.md`,
    );
    await fs.writeFile(sharedPromptFile, revPrompt, {mode: 0o644});
    console.log(
      `📝 Saved shared reviewer prompt reference for issue #${task.issueNumber}`,
    );

    return sharedPromptFile;
  }

  private async getReviewFromAgent(
    task: IssueTask,
    reviewerProfile: string,
    reviewerId: string,
    sharedPromptFile: string,
  ): Promise<TaskReview> {
    console.log(
      `👨‍💻 ${reviewerId} (${reviewerProfile}) reviewing PR #${task.prNumber}`,
    );

    // Read shared prompt and load profile-specific content
    const sharedPrompt = await fs.readFile(sharedPromptFile, 'utf-8');
    const profileContent = await this.loadProfileSpecificContent(
      reviewerProfile,
    );

    const customizedPrompt = sharedPrompt
      .replace(/REVIEWER_PROFILE_PLACEHOLDER/g, reviewerProfile.toLowerCase())
      .replace(/AGENT_ID_PLACEHOLDER/g, reviewerId)
      .replace(/PROFILE_SPECIFIC_CONTENT_PLACEHOLDER/g, profileContent);

    // Save individual reviewer prompt as reference material
    await this.saveReviewerPromptReference(
      task,
      reviewerProfile,
      reviewerId,
      customizedPrompt,
    );

    const reviewResponse = await ClaudeUtils.executeAgent(
      customizedPrompt,
      'reviewer',
      this.worktreeManager.path,
    );
    if (!reviewResponse) {
      throw new Error(
        `No response from reviewer agent ${reviewerId} for PR #${task.prNumber}`,
      );
    }
    return {
      reviewerId,
      result: ClaudeUtils.parseReviewResult(reviewResponse),
      comments: ClaudeUtils.parseReviewComments(reviewResponse),
      timestamp: Date.now(),
      prNumber: task.prNumber,
    };
  }

  private async getLatestPRNumber(): Promise<number | undefined> {
    const prs = await GitHubUtils.listPRs(1, this.worktreeManager.path);
    return prs[0]?.number;
  }

  private async createFeaturePR(spec: FeatureSpec): Promise<void> {
    console.log(`📄 Creating final feature PR: ${spec.name}`);

    const readableFeatureName = this.convertToReadableTitle(spec.name);
    const prTitle = `feat: ${readableFeatureName}`;
    const prBody = this.buildFeaturePRBody(spec, readableFeatureName);

    await GitHubUtils.createPR(
      prTitle,
      prBody,
      spec.baseBranch,
      this.worktreeManager.path,
    );
  }

  private buildFeaturePRBody(
    spec: FeatureSpec,
    readableFeatureName: string,
  ): string {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed')
      .map(t => `- [x] #${t.issueNumber}: ${t.title}`)
      .join('\n');

    return `## ${readableFeatureName}

${spec.description}

### Completed Issues:
${completedTasks}

### Review Summary:
All tasks have been reviewed and approved by their specified reviewer agents.

### Multi-Agent System Details:
- **Feature Branch:** \`feature/${spec.name}\`
- **Architecture Notes:** Available in \`.codettea/${spec.name}/ARCHITECTURE_NOTES.md\`
- **Agent Prompts:** Saved in \`.codettea/${spec.name}/\` for audit trail

🤖 Generated automatically by Multi-Agent Feature Development System
`;
  }

  private hasIncompleteTasks(): boolean {
    return Array.from(this.tasks.values()).some(
      task => task.status !== 'completed',
    );
  }

  private allTasksCompleted(): boolean {
    return Array.from(this.tasks.values()).every(
      task => task.status === 'completed',
    );
  }

  private getReadyTasks(): IssueTask[] {
    return Array.from(this.tasks.values()).filter(task => {
      if (task.status !== 'pending') return false;

      return task.dependencies.every(depIssueNum => {
        const dep = this.tasks.get(depIssueNum);
        return dep?.status === 'completed';
      });
    });
  }

  private async architectFeature(spec: FeatureSpec): Promise<number[]> {
    console.log(`🏗️ Starting architecture phase for: ${spec.name}`);

    // Setup specialized architecture environment
    await this.worktreeManager.setupForArchitecture(
      this.featureName,
      spec.baseBranch,
    );

    // Read architecture template
    const archTemplate = await fs.readFile(
      path.join(__dirname, 'prompts/arch.md'),
      'utf-8',
    );

    // Customize with variables
    const archPrompt = ClaudeUtils.customizePromptTemplate(archTemplate, {
      FEATURE_REQUEST: spec.description,
      AGENT_ID: `arch-${Date.now()}`,
      MAIN_REPO_PATH: this.config.mainRepoPath,
      WORKTREE_PATH: this.worktreeManager.path,
    });

    // Call architecture agent
    console.log(`🤖 Calling architecture agent...`);
    const archResponse = await ClaudeUtils.executeAgent(
      archPrompt,
      'architect',
      this.worktreeManager.path,
    );
    if (!archResponse) {
      throw new Error('No response from architecture agent');
    }

    // Parse created issues from the response
    const issueMatches = archResponse.match(/#(\d+)/g) || [];
    const issueNumbers = issueMatches
      .map(match => parseInt(match.substring(1)))
      .filter((num, index, array) => array.indexOf(num) === index);

    if (issueNumbers.length === 0) {
      console.log(
        `⚠️ No issues detected in architecture response. Checking GitHub...`,
      );
      // Fallback: get recently created issues
      const recentIssues = await GitHubUtils.listIssues(
        spec.name,
        20,
        this.config.mainRepoPath,
      );
      issueNumbers.push(...recentIssues);
    }

    try {
      await this.worktreeManager.commitArchitectureChanges(
        this.featureName,
        issueNumbers,
      );
    } catch (commitError) {
      console.log(
        `⚠️  No architecture files to commit or commit failed: ${commitError}`,
      );
    }

    console.log(
      `✅ Architecture phase complete. Created ${
        issueNumbers.length
      } issues: ${issueNumbers.join(', ')}`,
    );
    return issueNumbers;
  }

  private async loadArchitectureContext(): Promise<string> {
    const contextPath = path.join(
      this.worktreeManager.path,
      '.codettea',
      this.featureName,
      'ARCHITECTURE_NOTES.md',
    );

    try {
      const context = await fs.readFile(contextPath, 'utf-8');
      console.log(`📋 Loaded architecture context from ${contextPath}`);
      return context;
    } catch (error) {
      console.log(`⚠️ No architecture context found at ${contextPath}`);
      return 'No architecture context available. This issue may be independent or part of a feature without architectural planning.';
    }
  }

  private async loadProfileSpecificContent(
    reviewerProfile: string,
  ): Promise<string> {
    const profilePath = path.join(
      __dirname,
      'prompts/profiles',
      reviewerProfile.toLowerCase(),
      'review.md',
    );

    try {
      const profileContent = await fs.readFile(profilePath, 'utf-8');
      console.log(`📋 Loaded ${reviewerProfile} profile content`);
      return profileContent;
    } catch (error) {
      console.log(
        `⚠️ No profile content found for ${reviewerProfile} at ${profilePath}`,
      );
      return `## ${reviewerProfile.toUpperCase()} Review Focus\n\nNo specific profile guidance available. Use general code review principles.`;
    }
  }

  private async saveSolverPromptReference(
    task: IssueTask,
    prompt: string,
  ): Promise<void> {
    const promptFileName = `solver-issue-${task.issueNumber}-attempt-${task.attempts}.md`;
    const promptPath = path.join(
      this.worktreeManager.path,
      '.codettea',
      this.featureName,
      promptFileName,
    );

    try {
      await fs.writeFile(promptPath, prompt, 'utf-8');
      console.log(`📝 Saved solver prompt reference: ${promptFileName}`);
    } catch (error) {
      console.log(`⚠️ Could not save solver prompt reference: ${error}`);
      // Non-critical error, don't throw
    }
  }

  private async saveReviewerPromptReference(
    task: IssueTask,
    reviewerProfile: string,
    reviewerId: string,
    prompt: string,
  ): Promise<void> {
    const promptFileName = `reviewer-${reviewerProfile}-${reviewerId}-issue-${task.issueNumber}-attempt-${task.attempts}.md`;
    const promptPath = path.join(
      this.worktreeManager.path,
      '.codettea',
      this.featureName,
      promptFileName,
    );

    try {
      await fs.writeFile(promptPath, prompt, 'utf-8');
      console.log(
        `📝 Saved ${reviewerProfile} reviewer prompt reference: ${promptFileName}`,
      );
    } catch (error) {
      console.log(`⚠️ Could not save reviewer prompt reference: ${error}`);
      // Non-critical error, don't throw
    }
  }

  private convertToReadableTitle(kebabCaseName: string): string {
    return kebabCaseName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export {MultiAgentFeatureOrchestrator, FeatureSpec, IssueTask as FeatureTask};
