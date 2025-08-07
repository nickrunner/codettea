#!/usr/bin/env tsx

import { exec, spawn, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface FeatureTask {
  issueNumber: number;
  title: string;
  description: string;
  dependencies: number[]; // Other issue numbers this depends on
  status: 'pending' | 'solving' | 'reviewing' | 'approved' | 'rejected' | 'completed';
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
  baseBranch: 'dev' | string; // Usually 'dev' or 'feature/feature-name'
  issues?: number[]; // GitHub issue numbers (optional for arch mode)
  isParentFeature: boolean; // True if this creates a feature branch, false if working on existing feature
  architectureMode: boolean; // True if we need to run architecture phase first
}

class MultiAgentFeatureOrchestrator {
  private tasks: Map<number, FeatureTask> = new Map();
  private config: {
    mainRepoPath: string;
    baseWorktreePath: string;
    maxConcurrentTasks: number;
    requiredApprovals: number;
    reviewerProfiles: string[];
  };
  private featureWorktreePath?: string;
  private featureName: string;
  private projectName: string;
  private activeProcesses: Set<any> = new Set();
  private signalHandlersRegistered = false;

  constructor(config: MultiAgentFeatureOrchestrator['config'], featureName: string, projectName?: string) {
    this.config = config;
    this.featureName = featureName;
    this.projectName = projectName || path.basename(config.mainRepoPath);
    this.featureWorktreePath = path.join(config.baseWorktreePath, `${this.projectName}-${featureName}`);
    this.setupSignalHandlers();
  }
  
  private setupSignalHandlers(): void {
    if (this.signalHandlersRegistered) return;
    
    const cleanup = () => {
      console.log('\n🛑 Received interrupt signal - cleaning up Claude processes...');
      this.killAllActiveProcesses();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', () => this.killAllActiveProcesses());
    
    this.signalHandlersRegistered = true;
  }
  
  private killAllActiveProcesses(): void {
    const myPid = 10526; // Claude Code instance PID - DON'T KILL MYSELF!
    
    for (const proc of this.activeProcesses) {
      if (proc && !proc.killed && proc.pid !== myPid) {
        console.log(`🛑 Terminating process PID ${proc.pid}...`);
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 2000);
      } else if (proc && proc.pid === myPid) {
        console.log(`⚠️  Skipping termination of Claude Code instance (PID ${myPid})`);
      }
    }
    this.activeProcesses.clear();
  }

  async executeFeature(spec: FeatureSpec): Promise<void> {
    console.log(`🚀 Starting multi-agent feature development: ${spec.name}`);
    console.log(`📁 Main repo: ${this.config.mainRepoPath}`);
    console.log(`📁 Worktree will be: ${this.featureWorktreePath}`);
    
    try {
      // Architecture phase (if needed)
      if (spec.architectureMode) {
        console.log(`🏗️ Running architecture phase for: ${spec.name}`);
        const issues = await this.runArchitecturePhase(spec);
        spec.issues = issues;
      }
      
      if (!spec.issues || spec.issues.length === 0) {
        throw new Error('No issues to process. Either provide issue numbers or use --arch mode.');
      }
      
      // Setup worktree and base branch
      await this.setupFeatureWorktree(spec);
      
      // Load and initialize tasks from GitHub issues
      await this.initializeTasksFromIssues(spec.issues);
      
      // Execute task dependency graph
      await this.executeTasks();
      
      // Create final feature PR if this is a parent feature
      if (spec.isParentFeature && !spec.architectureMode) {
        await this.createFeaturePR(spec);
      }
      
      console.log(`✅ Feature ${spec.name} completed successfully!`);
      
    } catch (error) {
      console.error(`❌ Feature ${spec.name} failed:`, error);
      throw error;
    }
  }

  private async setupFeatureWorktree(spec: FeatureSpec): Promise<void> {
    console.log(`🌳 Setting up worktree for ${spec.name}`);
    
    // Ensure main repo is up to date
    await execAsync(`git checkout ${spec.baseBranch}`, { cwd: this.config.mainRepoPath });
    await execAsync(`git pull origin ${spec.baseBranch}`, { cwd: this.config.mainRepoPath });
    
    // Create feature branch if this is a parent feature
    if (spec.isParentFeature) {
      const featureBranchName = `feature/${this.featureName}`;
      
      // Check if branch exists locally
      let branchExists = false;
      try {
        const { stdout } = await execAsync(`git branch --list ${featureBranchName}`, { cwd: this.config.mainRepoPath });
        branchExists = stdout.trim().length > 0;
      } catch {
        branchExists = false;
      }

      if (branchExists) {
        // Check if branch is already checked out in a worktree
        const isInWorktree = await this.isBranchInWorktree(featureBranchName);
        
        if (isInWorktree) {
          console.log(`✅ Branch ${featureBranchName} already active in worktree - skipping checkout`);
        } else {
          // Branch exists but not in a worktree, checkout in main repo
          await execAsync(`git checkout ${featureBranchName}`, { cwd: this.config.mainRepoPath });
          console.log(`✅ Switched to existing branch: ${featureBranchName}`);
        }
      } else {
        // Branch doesn't exist, create it
        await execAsync(`git checkout -b ${featureBranchName}`, { cwd: this.config.mainRepoPath });
        await execAsync(`git push -u origin ${featureBranchName}`, { cwd: this.config.mainRepoPath });
        console.log(`✅ Created new branch: ${featureBranchName}`);
      }
      
      // Merge dev into feature branch to stay current (do this in the worktree if it exists)
      const mergeLocation = await this.worktreeExists() ? this.featureWorktreePath! : this.config.mainRepoPath;
      await execAsync(`git merge dev`, { cwd: mergeLocation });
    }
    
    // Create worktree
    if (!await this.worktreeExists()) {
      const targetBranch = spec.isParentFeature ? `feature/${this.featureName}` : spec.baseBranch;
      await execAsync(
        `git worktree add ${this.featureWorktreePath} ${targetBranch}`, 
        { cwd: this.config.mainRepoPath }
      );
    }
    
    // Copy .claude configuration to worktree
    await this.copyClaudeConfig();
  }

  private async copyClaudeConfig(): Promise<void> {
    const sourceClaudeDir = path.join(this.config.mainRepoPath, '.claude');
    const targetClaudeDir = path.join(this.featureWorktreePath!, '.claude');
    
    await execAsync(`cp -r "${sourceClaudeDir}" "${targetClaudeDir}"`, { cwd: '/' });
  }

  private async worktreeExists(): Promise<boolean> {
    try {
      await fs.access(this.featureWorktreePath!);
      return true;
    } catch {
      return false;
    }
  }

  private async isBranchInWorktree(branchName: string): Promise<boolean> {
    try {
      // Get list of all worktrees and their branches
      const { stdout } = await execAsync('git worktree list --porcelain', { cwd: this.config.mainRepoPath });
      
      // Parse worktree list output
      const worktrees = stdout.trim().split('\n\n');
      
      for (const worktree of worktrees) {
        const lines = worktree.split('\n');
        for (const line of lines) {
          if (line.startsWith('branch refs/heads/')) {
            const branch = line.replace('branch refs/heads/', '');
            if (branch === branchName) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private async initializeTasksFromIssues(issueNumbers: number[]): Promise<void> {
    console.log(`📋 Loading ${issueNumbers.length} GitHub issues as tasks`);
    
    for (const issueNumber of issueNumbers) {
      const issueData = await this.getGitHubIssue(issueNumber);
      
      const task: FeatureTask = {
        issueNumber,
        title: issueData.title,
        description: issueData.body,
        dependencies: this.parseDependencies(issueData.body),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        reviewHistory: [],
        worktreePath: this.featureWorktreePath
      };
      
      this.tasks.set(issueNumber, task);
    }
  }

  private async getGitHubIssue(issueNumber: number): Promise<any> {
    const { stdout } = await execAsync(
      `gh issue view ${issueNumber} --json title,body,state`, 
      { cwd: this.config.mainRepoPath }
    );
    return JSON.parse(stdout);
  }

  private parseDependencies(issueBody: string): number[] {
    // Look for "Depends on #123" or "Blocked by #456" patterns
    const dependencyRegex = /(?:depends on|blocked by)\s+#(\d+)/gi;
    const matches = Array.from(issueBody.matchAll(dependencyRegex));
    return matches.map(match => parseInt(match[1]));
  }

  private async executeTasks(): Promise<void> {
    const activeTasks = new Set<number>();
    
    while (this.hasIncompleteTasks()) {
      const readyTasks = this.getReadyTasks().filter(task => 
        !activeTasks.has(task.issueNumber) && 
        activeTasks.size < this.config.maxConcurrentTasks
      );

      for (const task of readyTasks) {
        activeTasks.add(task.issueNumber);
        this.executeTask(task).finally(() => activeTasks.delete(task.issueNumber));
      }

      await this.sleep(2000);
    }
  }

  private async executeTask(task: FeatureTask): Promise<void> {
    console.log(`📋 Starting task: #${task.issueNumber} - ${task.title}`);
    task.status = 'solving';
    task.attempts++;

    try {
      // Use your solve.md workflow
      await this.solveTaskWithClaudeAgent(task);
      
      // Review process with your rev.md workflow  
      const approved = await this.reviewTask(task);
      
      if (approved) {
        task.status = 'completed';
        await this.closeGitHubIssue(task.issueNumber);
        console.log(`✅ Task completed: #${task.issueNumber}`);
      } else {
        task.status = 'rejected';
        if (task.attempts < task.maxAttempts) {
          console.log(`🔄 Retrying task: #${task.issueNumber} (attempt ${task.attempts}/${task.maxAttempts})`);
          task.status = 'pending';
          task.reviewHistory = [];
        } else {
          throw new Error(`Task failed after ${task.maxAttempts} attempts: #${task.issueNumber}`);
        }
      }
    } catch (error) {
      task.status = 'rejected';
      console.error(`❌ Task failed: #${task.issueNumber}`, error);
      throw error;
    }
  }

  private async solveTaskWithClaudeAgent(task: FeatureTask): Promise<void> {
    console.log(`🤖 Calling solver agent for issue #${task.issueNumber}`);
    
    // Read our custom solve.md prompt template
    const solvePromptTemplate = await fs.readFile(
      path.join(__dirname, 'commands/solve.md'), 
      'utf-8'
    );
    
    // Customize the prompt with task-specific variables
    const solvePrompt = this.customizePromptTemplate(solvePromptTemplate, {
      ISSUE_NUMBER: task.issueNumber.toString(),
      FEATURE_NAME: this.featureName,
      ATTEMPT_NUMBER: task.attempts.toString(),
      MAX_ATTEMPTS: task.maxAttempts.toString(),
      AGENT_ID: `solver-${Date.now()}`,
      WORKTREE_PATH: task.worktreePath!,
      BASE_BRANCH: await this.getCurrentBranchName(task.worktreePath!)
    });
    
    // Add context about previous failures if retrying
    const contextualPrompt = task.attempts > 1 
      ? `${solvePrompt}\n\n**PREVIOUS ATTEMPT FEEDBACK:**\n${this.getPreviousFailureFeedback(task)}`
      : solvePrompt;

    // Call Claude Code agent in the worktree
    const _solution = await this.callClaudeCodeAgent(contextualPrompt, 'solver', task.worktreePath!);
    
    // The agent should have created a PR as part of solve.md workflow
    task.prNumber = await this.getLatestPRNumber();
    task.branch = await this.getCurrentBranchName(task.worktreePath!);
  }

  private getPreviousFailureFeedback(task: FeatureTask): string {
    return task.reviewHistory
      .filter(review => review.result === 'REJECT')
      .map(review => `- ${review.reviewerId}: ${review.comments}`)
      .join('\n');
  }

  private async reviewTask(task: FeatureTask): Promise<boolean> {
    if (!task.prNumber) {
      throw new Error(`No PR created for task #${task.issueNumber}`);
    }
    
    console.log(`🔍 Reviewing PR #${task.prNumber} for task #${task.issueNumber}`);
    task.status = 'reviewing';
    
    const reviews: TaskReview[] = [];
    
    // Get reviews from 3 different reviewer agents using your rev.md workflow
    for (let i = 0; i < this.config.requiredApprovals; i++) {
      const reviewerProfile = this.config.reviewerProfiles[i];
      const review = await this.getReviewFromAgent(task, reviewerProfile, `reviewer-${i}`);
      reviews.push(review);
      task.reviewHistory.push(review);
    }
    
    const approvals = reviews.filter(r => r.result === 'APPROVE').length;
    return approvals === this.config.requiredApprovals;
  }

  private async getReviewFromAgent(
    task: FeatureTask, 
    reviewerProfile: string, 
    reviewerId: string
  ): Promise<TaskReview> {
    console.log(`👨‍💻 ${reviewerId} (${reviewerProfile}) reviewing PR #${task.prNumber}`);
    
    // Read our custom rev.md prompt template
    const revPromptTemplate = await fs.readFile(
      path.join(__dirname, 'commands/review.md'), 
      'utf-8'
    );
    
    // Customize the prompt with task-specific variables
    const revPrompt = this.customizePromptTemplate(revPromptTemplate, {
      PR_NUMBER: task.prNumber!.toString(),
      ISSUE_NUMBER: task.issueNumber.toString(),
      FEATURE_NAME: this.featureName,
      REVIEWER_PROFILE: reviewerProfile.toLowerCase(),
      AGENT_ID: reviewerId,
      WORKTREE_PATH: task.worktreePath!,
      ATTEMPT_NUMBER: task.attempts.toString()
    });

    const reviewResponse = await this.callClaudeCodeAgent(revPrompt, 'reviewer', task.worktreePath!);
    if(!reviewResponse) {
      throw new Error(`No response from reviewer agent ${reviewerId} for PR #${task.prNumber}`);
    }
    return {
      reviewerId,
      result: this.parseReviewResult(reviewResponse),
      comments: this.parseReviewComments(reviewResponse),
      timestamp: Date.now(),
      prNumber: task.prNumber
    };
  }

  private async callClaudeCodeAgent(
    prompt: string, 
    agentType: string, 
    workingDir: string
  ): Promise<string | undefined> {
    // Create a temporary prompt file for reference
    const promptFile = path.join(workingDir, `.claude-${agentType}-prompt.md`);
    await fs.writeFile(promptFile, prompt, { mode: 0o644 }); // Make sure it's readable
    
    try {
      console.log(`🤖 Executing ${agentType} agent in ${workingDir}`);
      console.log(`📄 Prompt file: ${promptFile}`);
      console.log(`📝 Prompt size: ${prompt.length} characters`);
      
      // Test if claude CLI is working first
      try {
        await execAsync('claude --version');
        console.log(`✅ Claude CLI is responsive`);
      } catch (versionError) {
        throw new Error(`Claude CLI not available: ${versionError}`);
      }
      
      // Test if prompt file is readable
      try {
        const testRead = await fs.readFile(promptFile, 'utf-8');
        console.log(`✅ Prompt file readable (${testRead.length} chars)`);
        
        // Show first few lines for debugging
        const firstLines = testRead.split('\n').slice(0, 5).join('\n');
        console.log(`📄 First few lines of prompt:`);
        console.log(`---`);
        console.log(firstLines);
        console.log(`---`);
      } catch (readError) {
        throw new Error(`Prompt file not readable: ${readError}`);
      }
      
      // Try a direct approach first for debugging
      console.log(`🧪 Testing direct Claude CLI access...`);
      try {
        const testCommand = `echo "Test: please respond with 'DIRECT_ACCESS_OK'" | claude --dangerously-skip-permissions`;
        const { stdout: testOutput } = await execAsync(testCommand, { cwd: workingDir, timeout: 30000 });
        console.log(`✅ Direct test result: ${testOutput.trim()}`);
      } catch (testError) {
        console.log(`⚠️  Direct test failed: ${testError}`);
      }
      
      // Try alternative approach with progress monitoring
      const useProgressMonitoring = true; // Use exec with progress monitoring
      
      if (useProgressMonitoring) {
        console.log(`🔧 Using exec with progress monitoring...`);
        
        // Create a response file path where Claude might write output
        const responseFile = path.join(workingDir, `.claude-${agentType}-response.md`);
        
        try {

          
          // Test with a smaller prompt first
          console.log(`🧪 Testing with small prompt first...`);
          const smallPromptFile = path.join(workingDir, `.claude-test-small.md`);
          await fs.writeFile(smallPromptFile, "Hello Claude, please respond with 'Small test works' and nothing else.");
          
          try {
            const { stdout: smallTest } = await execAsync(`claude --dangerously-skip-permissions < "${smallPromptFile}"`, {
              cwd: workingDir,
              timeout: 30000, // 30 second timeout for small test
              env: { ...process.env, PWD: workingDir }
            });
            console.log(`✅ Small test result: "${smallTest.trim()}"`);
            await fs.unlink(smallPromptFile);
          } catch (smallError) {
            console.log(`❌ Small test failed: ${smallError}`);
            await fs.unlink(smallPromptFile).catch(() => {});
            throw new Error(`Claude CLI not working properly: ${smallError}`);
          }
          
          // If small test works, proceed with full prompt (note: output comes at end, not streaming)
          console.log(`📝 Small test passed, processing full prompt...`);
          console.log(`⏳ Claude is analyzing the comprehensive instructions (may take 10-30 minutes)...`);
          console.log(`💡 Note: Complex multi-agent prompts take time - Claude is working even when quiet\n`);
          
          return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';
            
            // Use the same approach that worked in our isolated test
            console.log(`🔧 Using bash approach (same as working test)...`);
            const claudeProcess = spawn('bash', ['-c', `cat "${promptFile}" | claude --dangerously-skip-permissions`], {
              cwd: workingDir,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { 
                ...process.env, 
                PWD: workingDir, 
                TERM: 'xterm-256color'
              }
            });
            
            console.log(`🚀 Claude streaming started (PID: ${claudeProcess.pid})`);
            
            // Close stdin immediately 
            claudeProcess.stdin.end();
            
            // Collect output (Claude CLI buffers, so this typically fires once at the end)
            claudeProcess.stdout.on('data', (data) => {
              const chunk = data.toString();
              output += chunk;
              
              // Show progress when we receive data (usually means it's finishing)
              if (chunk.length > 100) {
                console.log(`📤 [Claude] Received response (${chunk.length} chars)`);
              }
            });
            
            // Stream stderr in real-time
            claudeProcess.stderr.on('data', (data) => {
              const chunk = data.toString();
              errorOutput += chunk;
              console.error(`🔴 [Claude Error] ${chunk.trimEnd()}`);
            });
            
            // Handle completion
            claudeProcess.on('close', (code) => {
              console.log(`\n✅ Claude CLI completed (exit code: ${code})`);
              console.log(`📤 Total response: ${output.length} characters`);
              
              if (errorOutput.trim()) {
                console.log(`⚠️ Stderr: ${errorOutput}`);
              }
              
              // Show Claude's full response
              if (output.trim()) {
                console.log(`\n\x1b[36m[Claude Response]\x1b[0m`);
                console.log('─'.repeat(80));
                console.log(output);
                console.log('─'.repeat(80));
              }
              
              // Clean up prompt file now that process is done
              setTimeout(async () => {
                try {
                  console.log(`🧹 Cleaning up prompt file: ${promptFile}`);
                  await fs.unlink(promptFile);
                } catch {}
              }, 1000);
              
              if (code !== 0) {
                reject(new Error(`Claude CLI exited with code ${code}. Stderr: ${errorOutput}`));
                return;
              }
              
              if (!output || output.trim().length === 0) {
                reject(new Error(`Claude Code agent returned no output. Stderr: ${errorOutput}`));
                return;
              }
              
              resolve(output.trim());
            });
            
            // Handle errors
            claudeProcess.on('error', (error) => {
              console.error(`❌ Process error: ${error.message}`);
              reject(new Error(`Failed to start Claude CLI: ${error.message}`));
            });
            
            // Add animated spinner and progress monitoring
            const startTime = Date.now();
            const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let spinnerIndex = 0;
            
            // Show spinner every 500ms
            const spinnerInterval = setInterval(() => {
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              const mins = Math.floor(elapsed / 60);
              const secs = elapsed % 60;
              const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              
              process.stdout.write(`\r${spinnerFrames[spinnerIndex]} Claude processing ${agentType} instructions... (${timeStr} elapsed)`);
              spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
            }, 500);
            
            // Progress updates every 2 minutes (with newline)
            const progressInterval = setInterval(() => {
              const elapsed = Math.floor((Date.now() - startTime) / 60000);
              process.stdout.write(`\r${' '.repeat(80)}\r`); // Clear spinner line
              console.log(`💭 Claude still working on comprehensive analysis... (${elapsed} mins elapsed)`);
            }, 120000);
            
            // Timeout after 1 hour for complex multi-agent prompts
            const timeout = setTimeout(() => {
              clearInterval(spinnerInterval);
              clearInterval(progressInterval);
              process.stdout.write(`\r${' '.repeat(80)}\r`); // Clear spinner line
              console.log(`⏰ Reached 1 hour timeout - this prompt may be too complex`);
              if (claudeProcess.pid !== 10526) { // Don't kill myself!
                claudeProcess.kill('SIGTERM');
              }
              reject(new Error('Claude CLI timed out after 1 hour - prompt may need simplification'));
            }, 3600000); // 1 hour = 3,600,000 ms
            
            claudeProcess.on('close', () => {
              clearInterval(spinnerInterval);
              clearInterval(progressInterval);
              clearTimeout(timeout);
              process.stdout.write(`\r${' '.repeat(80)}\r`); // Clear spinner line
            });
          });
          
        } catch (execError: any) {
          console.error(`❌ execAsync failed: ${execError.message}`);
          if (execError.stdout) {
            console.log(`Partial output: ${execError.stdout.substring(0, 500)}`);
          }
          throw execError;
        }
      }
      
    } catch (error) {
      console.log(`❌ Claude CLI execution failed: ${error}`);
      throw new Error(`Claude Code agent execution failed: ${error}`);
    }
  }

  private parseReviewResult(reviewResponse: string): 'APPROVE' | 'REJECT' {
    const response = reviewResponse.toLowerCase();
    if (response.includes('approve') || response.includes('lgtm') || response.includes('✅')) {
      return 'APPROVE';
    }
    return 'REJECT';
  }

  private parseReviewComments(reviewResponse: string): string {
    // Extract meaningful comments from the review response
    const lines = reviewResponse.split('\n');
    const filteredLines = lines.filter(line => 
      line.trim() && 
      !line.includes('claude') &&
      !line.includes('🤖')
    );
    
    return filteredLines.join('\n').trim();
  }

  private async getLatestPRNumber(): Promise<number | undefined> {
    try {
      const { stdout } = await execAsync(
        `gh pr list --limit 1 --json number`, 
        { cwd: this.featureWorktreePath! }
      );
      const prs = JSON.parse(stdout);
      return prs[0]?.number;
    } catch {
      return undefined;
    }
  }

  private async getCurrentBranchName(workingDir: string): Promise<string> {
    const { stdout } = await execAsync('git branch --show-current', { cwd: workingDir });
    return stdout.trim();
  }

  private async closeGitHubIssue(issueNumber: number): Promise<void> {
    await execAsync(
      `gh issue close ${issueNumber} --comment "✅ Completed by multi-agent system"`, 
      { cwd: this.config.mainRepoPath }
    );
  }

  private async createFeaturePR(spec: FeatureSpec): Promise<void> {
    console.log(`📄 Creating final feature PR: ${spec.name}`);
    
    const prTitle = `feat: ${spec.name}`;
    const prBody = this.buildFeaturePRBody(spec);
    
    await execAsync(
      `gh pr create --title "${prTitle}" --body "${prBody}" --base ${spec.baseBranch}`,
      { cwd: this.featureWorktreePath! }
    );
  }

  private buildFeaturePRBody(spec: FeatureSpec): string {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed')
      .map(t => `- [x] #${t.issueNumber}: ${t.title}`)
      .join('\n');

    return `## Feature: ${spec.name}

${spec.description}

### Completed Issues:
${completedTasks}

### Review Summary:
All tasks have been reviewed and approved by ${this.config.requiredApprovals} independent agents.

🤖 Generated automatically by Multi-Agent Feature Development System
`;
  }

  private hasIncompleteTasks(): boolean {
    return Array.from(this.tasks.values()).some(task => task.status !== 'completed');
  }

  private getReadyTasks(): FeatureTask[] {
    return Array.from(this.tasks.values()).filter(task => {
      if (task.status !== 'pending') return false;
      
      return task.dependencies.every(depIssueNum => {
        const dep = this.tasks.get(depIssueNum);
        return dep?.status === 'completed';
      });
    });
  }

  private async runArchitecturePhase(spec: FeatureSpec): Promise<number[]> {
    console.log(`🏗️ Starting architecture phase for: ${spec.name}`);
    
    // Read architecture template
    const archTemplate = await fs.readFile(
      path.join(__dirname, 'commands/arch.md'),
      'utf-8'
    );
    
    // Customize with variables
    const archPrompt = this.customizePromptTemplate(archTemplate, {
      FEATURE_REQUEST: spec.description,
      AGENT_ID: `arch-${Date.now()}`,
      MAIN_REPO_PATH: this.config.mainRepoPath,
      WORKTREE_PATH: this.featureWorktreePath!
    });
    
    // Call architecture agent
    console.log(`🤖 Calling architecture agent...`);
    const archResponse = await this.callClaudeCodeAgent(archPrompt, 'architect', this.config.mainRepoPath);
    if(!archResponse) {
      throw new Error('No response from architecture agent');
    }
    // Parse created issues from the response
    const issueNumbers = this.parseCreatedIssues(archResponse);
    
    if (issueNumbers.length === 0) {
      console.log(`⚠️ No issues detected in architecture response. Checking GitHub...`);
      // Fallback: get recently created issues
      issueNumbers.push(...await this.getRecentIssuesForFeature(spec.name));
    }
    
    console.log(`✅ Architecture phase complete. Created ${issueNumbers.length} issues: ${issueNumbers.join(', ')}`);
    return issueNumbers;
  }

  private parseCreatedIssues(response: string): number[] {
    const issueMatches = response.match(/#(\d+)/g) || [];
    return issueMatches
      .map(match => parseInt(match.substring(1)))
      .filter((num, index, array) => array.indexOf(num) === index); // Remove duplicates
  }

  private async getRecentIssuesForFeature(featureName: string): Promise<number[]> {
    try {
      const { stdout } = await execAsync(
        `gh issue list --label "${featureName}" --limit 20 --json number --jq '.[].number'`,
        { cwd: this.config.mainRepoPath }
      );
      return stdout.trim().split('\n').map(num => parseInt(num)).filter(num => !isNaN(num));
    } catch {
      console.warn(`⚠️ Could not retrieve issues for feature ${featureName}`);
      return [];
    }
  }

  private customizePromptTemplate(template: string, variables: Record<string, string>): string {
    let customized = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `$${key}`;
      customized = customized.replace(new RegExp(placeholder.replace(/\$/g, '\\$'), 'g'), value);
    }
    
    return customized;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { MultiAgentFeatureOrchestrator, FeatureSpec, FeatureTask };