#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentFeatureOrchestrator = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const github_1 = require("./utils/github");
const claude_1 = require("./utils/claude");
const worktreeManager_1 = require("./utils/worktreeManager");
const feedbackManager_1 = require("./utils/feedbackManager");
class MultiAgentFeatureOrchestrator {
    tasks = new Map();
    config;
    worktreeManager;
    featureName;
    projectName;
    signalHandlersRegistered = false;
    constructor(config, featureName, projectName) {
        this.config = config;
        this.featureName = featureName;
        this.projectName = projectName || path_1.default.basename(config.mainRepoPath);
        this.worktreeManager = new worktreeManager_1.WorktreeManager({
            mainRepoPath: config.mainRepoPath,
            baseWorktreePath: config.baseWorktreePath,
            projectName: this.projectName,
        }, featureName);
        this.setupSignalHandlers();
    }
    setupSignalHandlers() {
        if (this.signalHandlersRegistered)
            return;
        const cleanup = () => {
            console.log('\n🛑 Received interrupt signal - exiting gracefully...');
            process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        this.signalHandlersRegistered = true;
    }
    async executeFeature(spec) {
        console.log(`🚀 Starting multi-agent feature development: ${spec.name}`);
        console.log(`📁 Main repo: ${this.config.mainRepoPath}`);
        console.log(`📁 Worktree will be: ${this.worktreeManager.path}`);
        try {
            // Architecture phase (if needed)
            if (spec.architectureMode) {
                const issues = await this.architectFeature(spec);
                spec.issues = issues;
            }
            else {
                await this.worktreeManager.setupForFeature(this.featureName, spec.baseBranch, spec.isParentFeature);
            }
            if (!spec.issues || spec.issues.length === 0) {
                throw new Error('No issues to process. Either provide issue numbers or use --arch mode.');
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
        }
        catch (error) {
            console.error(`❌ Feature ${spec.name} failed:`, error);
            throw error;
        }
    }
    async initializeTasksFromIssues(issueNumbers) {
        console.log(`📋 Loading ${issueNumbers.length} GitHub issues as tasks`);
        for (const issueNumber of issueNumbers) {
            const issueData = await github_1.GitHubUtils.getIssue(issueNumber, this.config.mainRepoPath);
            // Check if there's already a PR for this issue
            const existingPR = await github_1.GitHubUtils.findPRForIssue(issueData.number, this.config.mainRepoPath);
            const task = {
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
    parseDependencies(issueBody) {
        // Look for "Depends on #123" or "Blocked by #456" patterns
        const dependencyRegex = /(?:depends on|blocked by)\s+#(\d+)/gi;
        const matches = Array.from(issueBody.matchAll(dependencyRegex));
        return matches.map(match => parseInt(match[1]));
    }
    parseRequiredReviewers(issueBody) {
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
        console.log(`📋 No specific reviewers found, using default: ${this.config.reviewerProfiles.join(', ')}`);
        return this.config.reviewerProfiles;
    }
    async executeTasks() {
        while (this.hasIncompleteTasks()) {
            // Debug: Show all task statuses
            const readyTasks = this.getReadyTasks();
            if (readyTasks.length > 0) {
                const task = readyTasks[0]; // Take the first ready task
                try {
                    await this.executeTask(task);
                    console.log(`✅ Task #${task.issueNumber} completed successfully`);
                }
                catch (error) {
                    console.error(`❌ Task #${task.issueNumber} failed:`, error);
                    return; // Stop execution on failure
                }
            }
            else {
                console.log('⏳ No ready tasks found, waiting...');
                await this.sleep(5000);
            }
        }
        console.log(`✅ All tasks completed!`);
    }
    async taskNeedsSolving(task) {
        // No PR exists - definitely needs solving
        if (!task.prNumber) {
            console.log(`📝 Task #${task.issueNumber} needs solving: No PR exists`);
            return true;
        }
        // We have review history in our internal tracking - needs solving
        if (task.reviewHistory.length > 0) {
            console.log(`📝 Task #${task.issueNumber} needs solving: Internal review history exists`);
            return true;
        }
        // Check if the PR itself has pending change requests
        try {
            const hasChangeRequests = await github_1.GitHubUtils.hasPendingChangeRequests(task.prNumber, this.config.mainRepoPath);
            if (hasChangeRequests) {
                console.log(`📝 Task #${task.issueNumber} needs solving: PR #${task.prNumber} has pending change requests`);
                return true;
            }
            console.log(`✅ Task #${task.issueNumber} ready for review: PR #${task.prNumber} has no pending change requests`);
            return false;
        }
        catch (error) {
            console.log(`⚠️ Could not check PR review status for task #${task.issueNumber}, defaulting to solve: ${error}`);
            return true;
        }
    }
    async executeTask(task) {
        console.log(`📋 Executing task: #${task.issueNumber} - ${task.title}`);
        try {
            // Check if we need to solve/re-solve the task
            const needsSolving = await this.taskNeedsSolving(task);
            if (needsSolving) {
                task.status = 'solving';
                task.attempts++;
                await this.solveTask(task);
            }
            else if (task.attempts === 0 && task.prNumber) {
                // Task has existing PR but hasn't been attempted yet - count this as first attempt
                task.attempts = 1;
                console.log(`📝 Counting existing PR #${task.prNumber} as attempt 1`);
            }
            // Review process with rev.md workflow
            const approved = await this.reviewTask(task);
            await this.completeTask(task, approved);
        }
        catch (error) {
            task.status = 'rejected';
            console.error(`❌ Task failed: #${task.issueNumber}`, error);
            throw error;
        }
    }
    async completeTask(task, approved) {
        if (approved) {
            console.log(`🎉 Task #${task.issueNumber} approved - starting completion workflow`);
            // Step 1: Merge the PR
            if (task.prNumber) {
                try {
                    await github_1.GitHubUtils.mergePR(task.prNumber, this.worktreeManager.path, 'squash');
                    console.log(`✅ PR #${task.prNumber} merged successfully`);
                }
                catch (error) {
                    console.error(`❌ Failed to merge PR #${task.prNumber}: ${error}`);
                    throw error;
                }
            }
            // Step 2: Close the issue (after successful merge)
            try {
                await github_1.GitHubUtils.closeIssue(task.issueNumber, '✅ Completed by multi-agent system - PR merged successfully', this.config.mainRepoPath);
                console.log(`✅ Issue #${task.issueNumber} closed`);
            }
            catch (error) {
                console.error(`❌ Failed to close issue #${task.issueNumber}: ${error}`);
                throw error;
            }
            // Step 3: Cleanup - handle branch deletion carefully in worktree environment
            try {
                // Get the actual branch name from the PR
                const branchName = await github_1.GitHubUtils.getPRBranchName(task.prNumber, this.worktreeManager.path);
                console.log(`🧹 Starting cleanup for branch: ${branchName}`);
                // First, switch the worktree back to the feature branch to free up the issue branch
                const featureBranch = this.worktreeManager.getFeatureBranchName(this.featureName);
                console.log(`🔄 Switching worktree from ${branchName} to ${featureBranch} for cleanup`);
                await this.worktreeManager.verifyWorktreeBranch(featureBranch);
                // Now we can safely delete the issue branch (remote first, then local)
                // This handles cases where gh pr merge --delete-branch failed
                await github_1.GitHubUtils.deleteBranch(branchName, this.config.mainRepoPath, // Use main repo for branch operations
                true);
                console.log(`🗑️ Successfully cleaned up branch: ${branchName}`);
            }
            catch (error) {
                // Branch cleanup is non-critical, log but don't fail the task
                console.log(`⚠️ Branch cleanup completed with warnings: ${error}`);
                console.log(`💡 Note: Branch may have been already deleted during PR merge`);
            }
            task.status = 'completed';
            task.reviewHistory = []; // Clear history on successful completion
            console.log(`🎯 Task #${task.issueNumber} fully completed: PR merged, issue closed, branch cleaned up`);
        }
        else {
            task.status = 'rejected';
            if (task.attempts < task.maxAttempts) {
                console.log(`🔄 Will retry task: #${task.issueNumber} (completed attempts: ${task.attempts}/${task.maxAttempts})`);
                task.status = 'pending';
                // Keep reviewHistory - we need it for taskNeedsSolving() check and solver feedback
            }
            else {
                throw new Error(`Task failed after ${task.maxAttempts} attempts: #${task.issueNumber}`);
            }
        }
    }
    async solveTask(task) {
        console.log(`🤖 Calling solver agent for issue #${task.issueNumber}`);
        // Read our custom solve.md prompt template
        const solvePromptTemplate = await promises_1.default.readFile(path_1.default.join(__dirname, 'prompts/solve.md'), 'utf-8');
        // Load issue details for context
        const issueData = await github_1.GitHubUtils.getIssue(task.issueNumber, this.config.mainRepoPath);
        const issueDetails = `#${task.issueNumber}: ${issueData.title}\n\n${issueData.body}`;
        // Load architecture context if available
        const architectureContextPath = path_1.default.join(this.worktreeManager.path, '.codettea', this.featureName, 'ARCHITECTURE_NOTES.md');
        // Setup issue-specific branch within the feature worktree
        const issueBranch = await this.worktreeManager.setupIssueBranch(this.featureName, task.issueNumber);
        // Get previous feedback if this is a retry
        const previousFeedback = task.attempts > 1
            ? await this.getPreviousFailureFeedback(task)
            : 'No previous attempts - this is the first implementation attempt.';
        // Customize the prompt with task-specific variables including feedback
        const contextualPrompt = claude_1.ClaudeAgent.customizePromptTemplate(solvePromptTemplate, {
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
        });
        // Create temporary prompt file for solver agent
        const promptPath = await this.createTemporaryPromptFile(`solver-${task.issueNumber}-${task.attempts}`, contextualPrompt);
        // Call Claude Code agent using the temporary prompt file (will be auto-cleaned)
        await claude_1.ClaudeAgent.executeFromFile(promptPath, 'solver', this.worktreeManager.path);
        // Commit changes and push to remote
        try {
            await this.worktreeManager.commitIssueChanges(task.issueNumber, issueData.title, issueBranch);
        }
        catch (gitError) {
            console.error(`⚠️  Failed to commit or push changes: ${gitError}`);
            throw gitError;
        }
        // Create or update PR for the issue
        const prTitle = `feat(#${task.issueNumber}): ${issueData.title}`;
        const prBody = `## Issue\nCloses #${task.issueNumber}\n\n## Changes\n- Automated changes for issue #${task.issueNumber}\n\n## Testing\n- [ ] Tests pass\n- [ ] Linting passes\n- [ ] Build passes\n\n## Review Notes\nThis PR is part of multi-agent feature development for ${this.featureName}.\nPlease review for code quality, type safety, and architectural consistency.\n\nAgent: solver-${Date.now()} | Attempt: ${task.attempts}`;
        const targetBranch = this.worktreeManager.getFeatureBranchName(this.featureName);
        // Check if PR already exists, update it instead of creating new one
        if (task.prNumber) {
            try {
                await github_1.GitHubUtils.updatePR(task.prNumber, prTitle, prBody, this.worktreeManager.path);
                console.log(`✅ Updated existing PR #${task.prNumber}`);
            }
            catch (updateError) {
                console.log(`⚠️ Could not update PR #${task.prNumber}: ${updateError}`);
                // Fall back to the existing PR number
            }
        }
        else {
            // No existing PR, create a new one
            const prNumber = await github_1.GitHubUtils.createPR(prTitle, prBody, targetBranch, this.worktreeManager.path);
            task.prNumber = prNumber || (await this.getLatestPRNumber());
        }
        task.branch = await this.worktreeManager.getCurrentBranch();
    }
    async getPreviousFailureFeedback(task) {
        return feedbackManager_1.FeedbackManager.generatePreviousFailureFeedback(task.reviewHistory, task.attempts);
    }
    async reviewTask(task) {
        if (!task.prNumber) {
            throw new Error(`No PR created for task #${task.issueNumber}`);
        }
        console.log(`🔍 Reviewing PR #${task.prNumber} for task #${task.issueNumber}`);
        task.status = 'reviewing';
        // Ensure we're on the correct issue branch before reviewing
        // This is important when we skip the solver phase (e.g., existing PR)
        const issueBranch = this.worktreeManager.getIssueBranchName(this.featureName, task.issueNumber);
        await this.worktreeManager.verifyWorktreeBranch(issueBranch);
        // Create shared prompt file for all reviewers
        const sharedPromptFile = await this.createSharedReviewerPrompt(task);
        try {
            // Get reviews from task-specific reviewers in parallel
            const reviewPromises = [];
            for (let i = 0; i < task.requiredReviewers.length; i++) {
                const reviewerProfile = task.requiredReviewers[i];
                reviewPromises.push(this.getReviewFromAgent(task, reviewerProfile, `reviewer-${i}`, sharedPromptFile));
            }
            const reviews = await Promise.all(reviewPromises);
            // Add all reviews to history
            reviews.forEach(review => task.reviewHistory.push(review));
            const approvals = reviews.filter(r => r.result === 'APPROVE').length;
            const requiredApprovals = task.requiredReviewers.length;
            console.log(`📊 Reviews: ${approvals}/${requiredApprovals} approved`);
            return approvals === requiredApprovals;
        }
        catch (error) {
            console.error(`❌ Review process failed for task #${task.issueNumber}:`, error);
            throw new Error(`Review process failed for task #${task.issueNumber}: ${error}`);
        }
    }
    async createSharedReviewerPrompt(task) {
        // Read our custom review.md prompt template
        const revPromptTemplate = await promises_1.default.readFile(path_1.default.join(__dirname, 'prompts/review.md'), 'utf-8');
        // Customize the prompt with task-specific variables (without reviewer-specific info)
        const revPrompt = claude_1.ClaudeAgent.customizePromptTemplate(revPromptTemplate, {
            PR_NUMBER: task.prNumber.toString(),
            ISSUE_NUMBER: task.issueNumber.toString(),
            FEATURE_NAME: this.featureName,
            REVIEWER_PROFILE: 'REVIEWER_PROFILE_PLACEHOLDER', // Will be replaced by each reviewer
            AGENT_ID: 'AGENT_ID_PLACEHOLDER', // Will be replaced by each reviewer
            WORKTREE_PATH: this.worktreeManager.path,
            ATTEMPT_NUMBER: task.attempts.toString(),
            PROFILE_SPECIFIC_CONTENT: 'PROFILE_SPECIFIC_CONTENT_PLACEHOLDER', // Will be replaced by each reviewer
        });
        // Save shared reviewer prompt as reference material
        const sharedPromptDir = path_1.default.join(this.worktreeManager.path, '.codettea', this.featureName);
        // Ensure the directory exists before writing the file
        await promises_1.default.mkdir(sharedPromptDir, { recursive: true });
        const sharedPromptFile = path_1.default.join(sharedPromptDir, `reviewer-shared-issue-${task.issueNumber}-attempt-${task.attempts}.md`);
        await promises_1.default.writeFile(sharedPromptFile, revPrompt, { mode: 0o644 });
        console.log(`📝 Saved shared reviewer prompt reference for issue #${task.issueNumber}`);
        return sharedPromptFile;
    }
    async getReviewFromAgent(task, reviewerProfile, reviewerId, sharedPromptFile) {
        console.log(`👨‍💻 ${reviewerId} (${reviewerProfile}) reviewing PR #${task.prNumber}`);
        // Read shared prompt and load profile-specific content
        const sharedPrompt = await promises_1.default.readFile(sharedPromptFile, 'utf-8');
        const profileContent = await this.loadProfileSpecificContent(reviewerProfile);
        const customizedPrompt = sharedPrompt
            .replace(/REVIEWER_PROFILE_PLACEHOLDER/g, reviewerProfile.toLowerCase())
            .replace(/AGENT_ID_PLACEHOLDER/g, reviewerId)
            .replace(/PROFILE_SPECIFIC_CONTENT_PLACEHOLDER/g, profileContent);
        // Create temporary prompt file for reviewer agent
        const promptPath = await this.createTemporaryPromptFile(`reviewer-${reviewerProfile}-${reviewerId}-${task.issueNumber}-${task.attempts}`, customizedPrompt);
        const reviewResponse = await claude_1.ClaudeAgent.executeFromFile(promptPath, 'reviewer', this.worktreeManager.path);
        if (!reviewResponse) {
            throw new Error(`No response from reviewer agent ${reviewerId} for PR #${task.prNumber}`);
        }
        const reviewResult = feedbackManager_1.FeedbackManager.parseReviewResult(reviewResponse);
        // Log if rework is specifically required based on the feedback content
        if (reviewResult === 'REJECT' &&
            feedbackManager_1.FeedbackManager.hasReworkRequiredFeedback(reviewResponse)) {
            console.log(`🔧 Reviewer ${reviewerId} provided specific rework feedback - will retry with context`);
        }
        // Submit the actual GitHub PR review with the full response
        try {
            await github_1.GitHubUtils.submitPRReview(task.prNumber, reviewResult, reviewResponse, // Pass the full response directly
            reviewerId, reviewerProfile, this.worktreeManager.path);
            console.log(`✅ Submitted GitHub PR review: ${reviewResult} by ${reviewerId}`);
        }
        catch (error) {
            console.log(`⚠️ Failed to submit GitHub PR review for ${reviewerId}: ${error}`);
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
    async getLatestPRNumber() {
        const prs = await github_1.GitHubUtils.listPRs(1, this.worktreeManager.path);
        return prs[0]?.number;
    }
    async createFeaturePR(spec) {
        console.log(`📄 Creating final feature PR: ${spec.name}`);
        const readableFeatureName = this.convertToReadableTitle(spec.name);
        const prTitle = `feat: ${readableFeatureName}`;
        const prBody = this.buildFeaturePRBody(spec, readableFeatureName);
        await github_1.GitHubUtils.createPR(prTitle, prBody, spec.baseBranch, this.worktreeManager.path);
    }
    buildFeaturePRBody(spec, readableFeatureName) {
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
    hasIncompleteTasks() {
        return Array.from(this.tasks.values()).some(task => task.status !== 'completed');
    }
    allTasksCompleted() {
        return Array.from(this.tasks.values()).every(task => task.status === 'completed');
    }
    getReadyTasks() {
        return Array.from(this.tasks.values()).filter(task => {
            if (task.status !== 'pending')
                return false;
            return task.dependencies.every(depIssueNum => {
                const dep = this.tasks.get(depIssueNum);
                // If dependency doesn't exist in our task list, assume it's completed elsewhere
                if (!dep) {
                    console.log(`⚠️ Task #${task.issueNumber} depends on #${depIssueNum} which is not in current task list - assuming completed`);
                    return true;
                }
                return dep.status === 'completed';
            });
        });
    }
    async architectFeature(spec) {
        console.log(`🏗️ Starting architecture phase for: ${spec.name}`);
        // Setup specialized architecture environment
        await this.worktreeManager.setupForArchitecture(this.featureName, spec.baseBranch);
        // Read architecture template
        const archTemplate = await promises_1.default.readFile(path_1.default.join(__dirname, 'prompts/arch.md'), 'utf-8');
        // Customize with variables
        const archPrompt = claude_1.ClaudeAgent.customizePromptTemplate(archTemplate, {
            FEATURE_REQUEST: spec.description,
            AGENT_ID: `arch-${Date.now()}`,
            MAIN_REPO_PATH: this.config.mainRepoPath,
            WORKTREE_PATH: this.worktreeManager.path,
        });
        // Create temporary prompt file for architecture agent
        const promptPath = await this.createTemporaryPromptFile(`architect-${spec.name}-${Date.now()}`, archPrompt);
        // Call architecture agent
        console.log(`🤖 Calling architecture agent...`);
        const archResponse = await claude_1.ClaudeAgent.executeFromFile(promptPath, 'architect', this.worktreeManager.path);
        if (!archResponse) {
            throw new Error('No response from architecture agent');
        }
        // Parse created issues from the response
        const issueMatches = archResponse.match(/#(\d+)/g) || [];
        const issueNumbers = issueMatches
            .map(match => parseInt(match.substring(1)))
            .filter((num, index, array) => array.indexOf(num) === index);
        if (issueNumbers.length === 0) {
            console.log(`⚠️ No issues detected in architecture response. Checking GitHub...`);
            // Fallback: get recently created issues
            const recentIssues = await github_1.GitHubUtils.listIssues(spec.name, 20, this.config.mainRepoPath);
            issueNumbers.push(...recentIssues);
        }
        try {
            await this.worktreeManager.commitArchitectureChanges(this.featureName, issueNumbers);
        }
        catch (commitError) {
            console.log(`⚠️  No architecture files to commit or commit failed: ${commitError}`);
        }
        console.log(`✅ Architecture phase complete. Created ${issueNumbers.length} issues: ${issueNumbers.join(', ')}`);
        return issueNumbers;
    }
    async loadProfileSpecificContent(reviewerProfile) {
        const profilePath = path_1.default.join(__dirname, 'prompts/profiles', reviewerProfile.toLowerCase(), 'review.md');
        try {
            const profileContent = await promises_1.default.readFile(profilePath, 'utf-8');
            console.log(`📋 Loaded ${reviewerProfile} profile content`);
            return profileContent;
        }
        catch (error) {
            console.log(`⚠️ No profile content found for ${reviewerProfile} at ${profilePath}`);
            return `## ${reviewerProfile.toUpperCase()} Review Focus\n\nNo specific profile guidance available. Use general code review principles.`;
        }
    }
    async createTemporaryPromptFile(filePrefix, prompt) {
        // Create temporary prompt files in .codettea root
        // These will be automatically cleaned up by ClaudeAgent after execution
        const timestamp = Date.now();
        const promptPath = path_1.default.join(this.worktreeManager.path, `.codettea/${filePrefix}-${timestamp}.md`);
        try {
            await promises_1.default.writeFile(promptPath, prompt, { mode: 0o644 });
            console.log(`📝 Created temporary prompt file: ${path_1.default.basename(promptPath)}`);
            return promptPath;
        }
        catch (error) {
            console.log(`⚠️ Could not create temporary prompt file: ${error}`);
            throw error; // Throw since we need the path to proceed
        }
    }
    convertToReadableTitle(kebabCaseName) {
        return kebabCaseName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.MultiAgentFeatureOrchestrator = MultiAgentFeatureOrchestrator;
//# sourceMappingURL=orchestrator.js.map