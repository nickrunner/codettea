#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import {GitHubUtils} from './utils/github';
import {ClaudeAgent} from './utils/claude';
import {WorktreeManager} from './utils/worktreeManager';
import {FeedbackManager} from './utils/feedbackManager';

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
    while (this.hasIncompleteTasks()) {
      // Debug: Show all task statuses

      const readyTasks = this.getReadyTasks();

      if (readyTasks.length > 0) {
        const task = readyTasks[0]; // Take the first ready task

        try {
          await this.executeTask(task);
          console.log(`✅ Task #${task.issueNumber} completed successfully`);
        } catch (error) {
          console.error(`❌ Task #${task.issueNumber} failed:`, error);
          return; // Stop execution on failure
        }
      } else {
        console.log('⏳ No ready tasks found, waiting...');
        await this.sleep(5000);
      }
    }
    console.log(`✅ All tasks completed!`);
  }

  private async taskNeedsSolving(task: IssueTask): Promise<boolean> {
    // No PR exists - definitely needs solving
    if (!task.prNumber) {
      console.log(`📝 Task #${task.issueNumber} needs solving: No PR exists`);
      return true;
    }

    // We have review history in our internal tracking - needs solving
    if (task.reviewHistory.length > 0) {
      console.log(
        `📝 Task #${task.issueNumber} needs solving: Internal review history exists`,
      );
      return true;
    }

    // Check if the PR itself has pending change requests
    try {
      const hasChangeRequests = await GitHubUtils.hasPendingChangeRequests(
        task.prNumber,
        this.config.mainRepoPath,
      );

      if (hasChangeRequests) {
        console.log(
          `📝 Task #${task.issueNumber} needs solving: PR #${task.prNumber} has pending change requests`,
        );
        return true;
      }

      console.log(
        `✅ Task #${task.issueNumber} ready for review: PR #${task.prNumber} has no pending change requests`,
      );
      return false;
    } catch (error) {
      console.log(
        `⚠️ Could not check PR review status for task #${task.issueNumber}, defaulting to solve: ${error}`,
      );
      return true;
    }
  }

  private async executeTask(task: IssueTask): Promise<void> {
    console.log(`📋 Executing task: #${task.issueNumber} - ${task.title}`);

    try {
      // Check if we need to solve/re-solve the task
      const needsSolving = await this.taskNeedsSolving(task);

      if (needsSolving) {
        task.status = 'solving';
        task.attempts++;
        await this.solveTask(task);
      } else if (task.attempts === 0 && task.prNumber) {
        // Task has existing PR but hasn't been attempted yet - count this as first attempt
        task.attempts = 1;
        console.log(`📝 Counting existing PR #${task.prNumber} as attempt 1`);
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

        // First, switch the worktree back to the feature branch to free up the issue branch
        const featureBranch = this.worktreeManager.getFeatureBranchName(
          this.featureName,
        );
        console.log(
          `🔄 Switching worktree from ${branchName} to ${featureBranch} for cleanup`,
        );
        await this.worktreeManager.verifyWorktreeBranch(featureBranch);

        // Now we can safely delete the issue branch (remote first, then local)
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
      task.reviewHistory = []; // Clear history on successful completion
      console.log(
        `🎯 Task #${task.issueNumber} fully completed: PR merged, issue closed, branch cleaned up`,
      );
    } else {
      task.status = 'rejected';
      if (task.attempts < task.maxAttempts) {
        console.log(
          `🔄 Will retry task: #${task.issueNumber} (completed attempts: ${task.attempts}/${task.maxAttempts})`,
        );
        task.status = 'pending';
        // Keep reviewHistory - we need it for taskNeedsSolving() check and solver feedback
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

    // Get previous feedback if this is a retry
    const previousFeedback =
      task.attempts > 1
        ? await this.getPreviousFailureFeedback(task)
        : 'No previous attempts - this is the first implementation attempt.';

    // Customize the prompt with task-specific variables including feedback
    const contextualPrompt = ClaudeAgent.customizePromptTemplate(
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
        PREVIOUS_FEEDBACK_SECTION: previousFeedback,
      },
    );

    // Create temporary prompt file for solver agent
    const promptPath = await this.createTemporaryPromptFile(
      `solver-${task.issueNumber}-${task.attempts}`,
      contextualPrompt,
    );

    // Call Claude Code agent using the temporary prompt file (will be auto-cleaned)
    await ClaudeAgent.executeFromFile(
      promptPath,
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

    // Create or update PR for the issue
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

    const targetBranch = this.worktreeManager.getFeatureBranchName(
      this.featureName,
    );

    // Check if PR already exists, update it instead of creating new one
    if (task.prNumber) {
      try {
        await GitHubUtils.updatePR(
          task.prNumber,
          prTitle,
          prBody,
          this.worktreeManager.path,
        );
        console.log(`✅ Updated existing PR #${task.prNumber}`);
      } catch (updateError) {
        console.log(`⚠️ Could not update PR #${task.prNumber}: ${updateError}`);
        // Fall back to the existing PR number
      }
    } else {
      // No existing PR, create a new one
      const prNumber = await GitHubUtils.createPR(
        prTitle,
        prBody,
        targetBranch,
        this.worktreeManager.path,
      );
      task.prNumber = prNumber || (await this.getLatestPRNumber());
    }

    task.branch = await this.worktreeManager.getCurrentBranch();
  }

  private async getPreviousFailureFeedback(task: IssueTask): Promise<string> {
    return FeedbackManager.generatePreviousFailureFeedback(
      task.reviewHistory,
      task.attempts,
    );
  }

  private async reviewTask(task: IssueTask): Promise<boolean> {
    if (!task.prNumber) {
      throw new Error(`No PR created for task #${task.issueNumber}`);
    }

    console.log(
      `🔍 Reviewing PR #${task.prNumber} for task #${task.issueNumber}`,
    );
    task.status = 'reviewing';

    // Ensure we're on the correct issue branch before reviewing
    // This is important when we skip the solver phase (e.g., existing PR)
    const issueBranch = this.worktreeManager.getIssueBranchName(
      this.featureName,
      task.issueNumber,
    );
    await this.worktreeManager.verifyWorktreeBranch(issueBranch);

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
    const revPrompt = ClaudeAgent.customizePromptTemplate(revPromptTemplate, {
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
    const sharedPromptDir = path.join(
      this.worktreeManager.path,
      '.codettea',
      this.featureName,
    );

    // Ensure the directory exists before writing the file
    await fs.mkdir(sharedPromptDir, {recursive: true});

    const sharedPromptFile = path.join(
      sharedPromptDir,
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

    // Create temporary prompt file for reviewer agent
    const promptPath = await this.createTemporaryPromptFile(
      `reviewer-${reviewerProfile}-${reviewerId}-${task.issueNumber}-${task.attempts}`,
      customizedPrompt,
    );

    const reviewResponse = await ClaudeAgent.executeFromFile(
      promptPath,
      'reviewer',
      this.worktreeManager.path,
    );
    if (!reviewResponse) {
      throw new Error(
        `No response from reviewer agent ${reviewerId} for PR #${task.prNumber}`,
      );
    }
    const reviewResult = FeedbackManager.parseReviewResult(reviewResponse);

    // Log if rework is specifically required based on the feedback content
    if (
      reviewResult === 'REJECT' &&
      FeedbackManager.hasReworkRequiredFeedback(reviewResponse)
    ) {
      console.log(
        `🔧 Reviewer ${reviewerId} provided specific rework feedback - will retry with context`,
      );
    }

    // Submit the actual GitHub PR review with the full response
    try {
      await GitHubUtils.submitPRReview(
        task.prNumber!,
        reviewResult,
        reviewResponse, // Pass the full response directly
        reviewerId,
        reviewerProfile,
        this.worktreeManager.path,
      );
      console.log(
        `✅ Submitted GitHub PR review: ${reviewResult} by ${reviewerId}`,
      );
    } catch (error) {
      console.log(
        `⚠️ Failed to submit GitHub PR review for ${reviewerId}: ${error}`,
      );
      // Continue anyway - we still have the internal review record
    }

    return {
      reviewerId,
      result: reviewResult,
      comments: reviewResponse, // Store the full response for history
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

        // If dependency doesn't exist in our task list, assume it's completed elsewhere
        if (!dep) {
          console.log(
            `⚠️ Task #${task.issueNumber} depends on #${depIssueNum} which is not in current task list - assuming completed`,
          );
          return true;
        }

        return dep.status === 'completed';
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
    const archPrompt = ClaudeAgent.customizePromptTemplate(archTemplate, {
      FEATURE_REQUEST: spec.description,
      AGENT_ID: `arch-${Date.now()}`,
      MAIN_REPO_PATH: this.config.mainRepoPath,
      WORKTREE_PATH: this.worktreeManager.path,
    });

    // Create temporary prompt file for architecture agent
    const promptPath = await this.createTemporaryPromptFile(
      `architect-${spec.name}-${Date.now()}`,
      archPrompt,
    );

    // Call architecture agent
    console.log(`🤖 Calling architecture agent...`);
    const archResponse = await ClaudeAgent.executeFromFile(
      promptPath,
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

  private async createTemporaryPromptFile(
    filePrefix: string,
    prompt: string,
  ): Promise<string> {
    // Create temporary prompt files in .codettea root
    // These will be automatically cleaned up by ClaudeAgent after execution
    const timestamp = Date.now();
    const promptPath = path.join(
      this.worktreeManager.path,
      `.codettea/${filePrefix}-${timestamp}.md`,
    );

    try {
      await fs.writeFile(promptPath, prompt, {mode: 0o644});
      console.log(
        `📝 Created temporary prompt file: ${path.basename(promptPath)}`,
      );
      return promptPath;
    } catch (error) {
      console.log(`⚠️ Could not create temporary prompt file: ${error}`);
      throw error; // Throw since we need the path to proceed
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
