#!/usr/bin/env tsx

import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import {MultiAgentFeatureOrchestrator, FeatureSpec} from './orchestrator';
import {GitHubUtils} from './utils/github';
import {ClaudeUtils} from './utils/claude';
import {WorktreeManager} from './utils/worktreeManager';
import {GitUtils} from './utils/git';

// Auto-detect the default branch for a repository
async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    // Try to get the default branch from remote
    const {stdout} = await execAsync(
      'git symbolic-ref refs/remotes/origin/HEAD',
      {cwd: repoPath},
    );
    return stdout.trim().replace('refs/remotes/origin/', '');
  } catch {
    // Fallback: check for common default branches using GitUtils
    if (await GitUtils.verifyBranch('main', repoPath)) {
      return 'main';
    } else if (await GitUtils.verifyBranch('master', repoPath)) {
      return 'master';
    } else {
      // Ultimate fallback
      return 'main';
    }
  }
}

const execAsync = promisify(exec);

// interface WorkflowOption {
//   id: string;
//   name: string;
//   description: string;
//   command: string;
//   examples: string[];
// }

interface FeatureStatus {
  name: string;
  branch: string;
  worktreePath: string;
  exists: boolean;
  issues: IssueStatus[];
  project?: string;
}

interface IssueStatus {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  inProgress?: boolean;
}

class InteractiveMultiAgentCLI {
  private rl: readline.Interface;
  private config: {
    mainRepoPath: string;
    baseWorktreePath: string;
    maxConcurrentTasks: number;
    requiredApprovals: number;
    reviewerProfiles: string[];
    baseBranch?: string; // Optional project-specific base branch override
  };
  private selectedProject?: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Initialize with default config - will be updated when project is selected
    this.config = {
      mainRepoPath: process.cwd(),
      baseWorktreePath: path.dirname(process.cwd()),
      maxConcurrentTasks: 2,
      requiredApprovals: 3,
      reviewerProfiles: ['frontend', 'backend', 'devops'],
    };
  }

  async start(): Promise<void> {
    console.clear();
    await this.showWelcome();

    // Select project first
    await this.selectProject();

    while (true) {
      try {
        const action = await this.showMainMenu();

        if (action === 'exit') {
          break;
        }

        await this.handleAction(action);

        // Wait for user before returning to menu
        await this.waitForUser('\n📋 Press Enter to return to main menu...');
      } catch (error) {
        console.error('\n❌ Error:', error);
        await this.waitForUser('\n📋 Press Enter to continue...');
      }
    }

    this.rl.close();
  }

  private async showWelcome(): Promise<void> {
    console.log(`
    ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪
    
    ╔═══════════════════════════════════════════╗
    ║           C O D E T T E A                  ║
    ║         /ko-det-TAY-ah/                   ║
    ║                                           ║
    ║     🎼 Orchestrating AI Agents 🎼         ║
    ╚═══════════════════════════════════════════╝
    
    ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪

Welcome to Codettea - conducting a symphony of AI agents!

Like a codetta brings musical closure, we orchestrate:
• 🎻 Architecture Agent - composes the structure
• 🎺 Solver Agents - perform the implementation
• 🎹 Reviewer Agents - harmonize quality checks
• 🎼 Orchestrator - conducts the ensemble

Environment Status:
┌─────────────────────────────────────────────
│ 📁 Current: ${process.cwd()}
│ 🔍 Scanning: ${path.dirname(
      process.cwd(),
    )} and ${process.cwd()}
│ 🤖 Claude Code: ${
      (await this.checkClaudeCode()) ? '✅ Available' : '❌ Not Found'
    }
└─────────────────────────────────────────────

🎵 Quick Start:
• Run from /git/codettea to scan projects
• Each feature performs in its own worktree
• Works best with CLAUDE.md configured projects

Ready to start the symphony? Maestro awaits! 🎭
`);
  }

  private async selectProject(): Promise<void> {
    console.log('\n🔍 Scanning for git repositories...\n');

    const gitProjects = await this.findGitProjects();

    if (gitProjects.length === 0) {
      console.log('❌ No git repositories found in the current directory.');
      console.log(
        '💡 Please run this tool from a directory containing git repositories.',
      );
      process.exit(1);
    }

    console.log('📂 Available Projects:\n');
    gitProjects.forEach((project, index) => {
      const hasClaudeMd = project.hasClaudeMd
        ? '✅ CLAUDE.md'
        : '⚠️  No CLAUDE.md';
      console.log(
        `  ${index + 1}. ${project.name} (${project.path}) - ${hasClaudeMd}`,
      );
    });

    const choice = await this.prompt(
      `\n🤖 Select a project (1-${gitProjects.length}): `,
    );
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < gitProjects.length) {
      const selected = gitProjects[index];
      this.selectedProject = selected.name;
      this.config.mainRepoPath = selected.path;
      this.config.baseWorktreePath = path.dirname(selected.path);

      // Load project-specific configuration
      await this.loadProjectConfig();

      console.log(`\n✅ Selected project: ${selected.name}`);
      if (!selected.hasClaudeMd) {
        console.log(
          '⚠️  Warning: This project does not have a CLAUDE.md file.',
        );
        console.log('   Consider adding one for better agent guidance.');
      }
    } else {
      console.log('❌ Invalid choice.');
      await this.selectProject();
    }
  }

  private async findGitProjects(): Promise<
    Array<{name: string; path: string; hasClaudeMd: boolean}>
  > {
    const currentDir = process.cwd();
    const parentDir = path.dirname(currentDir);
    const projects: Array<{name: string; path: string; hasClaudeMd: boolean}> =
      [];

    // First, check the parent directory for git projects (typical use case)
    try {
      const parentEntries = await fs.readdir(parentDir, {withFileTypes: true});

      for (const entry of parentEntries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(parentDir, entry.name);
          const gitPath = path.join(projectPath, '.git');

          try {
            const stats = await fs.stat(gitPath);
            if (stats.isDirectory()) {
              // Check for CLAUDE.md
              let hasClaudeMd = false;
              try {
                await fs.stat(path.join(projectPath, 'CLAUDE.md'));
                hasClaudeMd = true;
              } catch {
                // CLAUDE.md might not exist, that's okay
              }

              projects.push({
                name: entry.name,
                path: projectPath,
                hasClaudeMd,
              });
            }
          } catch {
            // Directory might not be a git repo or have issues
          }
        }
      }

      // Also check subdirectories of current directory (in case running from git root)
      const currentEntries = await fs.readdir(currentDir, {
        withFileTypes: true,
      });

      for (const entry of currentEntries) {
        if (entry.isDirectory() && !projects.some(p => p.name === entry.name)) {
          const projectPath = path.join(currentDir, entry.name);
          const gitPath = path.join(projectPath, '.git');

          try {
            const stats = await fs.stat(gitPath);
            if (stats.isDirectory()) {
              let hasClaudeMd = false;
              try {
                await fs.stat(path.join(projectPath, 'CLAUDE.md'));
                hasClaudeMd = true;
              } catch {
                // CLAUDE.md might not exist, that's okay
              }

              projects.push({
                name: entry.name,
                path: projectPath,
                hasClaudeMd,
              });
            }
          } catch {
            // Directory might not be a git repo or have issues
          }
        }
      }
    } catch (error) {
      console.error('Error scanning for projects:', error);
    }

    return projects;
  }

  private async showMainMenu(): Promise<string> {
    const options = [
      '🏗️  Start New Feature (Full Architecture + Implementation)',
      '🔧  Work on Existing Issues',
      '📊  View Current Status',
      '🌳  Manage Worktrees',
      '🔄  Switch Project',
      '⚙️  Configuration',
      '❌  Exit',
    ];

    console.log(
      `\n📋 What would you like to do? (Project: ${this.selectedProject})\n`,
    );

    options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });

    const choice = await this.prompt('\n🤖 Select an option (1-7): ');

    const actions = [
      'new-feature',
      'existing-issues',
      'status',
      'worktrees',
      'switch-project',
      'config',
      'exit',
    ];
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < actions.length) {
      return actions[index];
    }

    console.log('❌ Invalid choice. Please select 1-7.');
    return await this.showMainMenu();
  }

  private async handleAction(action: string): Promise<void> {
    switch (action) {
      case 'new-feature':
        await this.handleNewFeature();
        break;
      case 'existing-issues':
        await this.handleExistingIssues();
        break;
      case 'status':
        await this.handleStatus();
        break;
      case 'worktrees':
        await this.handleWorktrees();
        break;
      case 'config':
        await this.handleConfig();
        break;
      case 'switch-project':
        await this.selectProject();
        break;
    }
  }

  private async handleNewFeature(): Promise<void> {
    console.clear();
    console.log(`
🏗️  New Feature Development
============================

This will create a complete feature from concept to production:

1. 📋 Architecture Planning - Analyze requirements and create technical design
2. 🌳 Infrastructure Setup - Create feature branch, worktree, and GitHub project  
3. 📝 Issue Creation - Break down into atomic, testable tasks
4. 🔧 Implementation - Multi-agent solve → review → approve cycle
5. 🚀 Integration - Final feature PR with complete audit trail
`);

    const featureName = await this.prompt(
      '📝 Feature name (kebab-case, e.g., "user-auth"): ',
    );

    if (!this.isValidFeatureName(featureName)) {
      console.log(
        '❌ Invalid feature name. Use kebab-case (letters, numbers, hyphens only)',
      );
      return;
    }

    console.log('\n📖 Feature description examples:');
    console.log(
      '  • "Implement user authentication with JWT tokens and password reset"',
    );
    console.log('  • "Add Stripe payment processing with webhook handling"');
    console.log('  • "Create dashboard analytics with real-time metrics"');

    const description = await this.prompt('\n📝 Feature description: ');

    if (!description.trim()) {
      console.log('❌ Description is required');
      return;
    }

    // Show preview
    console.log(`\n🔍 Preview:
    
🏷️  Feature: ${featureName}
📖 Description: ${description}
🌿 Branch: feature/${featureName}  
🌳 Worktree: ${
      this.config.baseWorktreePath
    }/${this.getProjectName()}-${featureName}
🤖 Mode: Architecture + Implementation
`);

    const confirm = await this.prompt('✅ Start feature development? (y/N): ');

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      return;
    }

    // Execute feature development
    await this.executeFeatureDevelopment(featureName, description, true);
  }

  private async handleExistingIssues(): Promise<void> {
    console.clear();
    console.log(`
🔧  Work on Existing Issues
===========================
`);

    // Show existing features
    const features = await this.getExistingFeatures();

    if (features.length === 0) {
      console.log(
        '📭 No active feature branches found. Use "Start New Feature" to create one.',
      );
      return;
    }

    console.log('🌿 Active Feature Branches (unmerged only):');
    console.log(
      `📁 Project: ${
        this.selectedProject || path.basename(this.config.mainRepoPath)
      } (${this.config.mainRepoPath})\n`,
    );

    features.forEach((feature, index) => {
      const status = feature.exists ? '✅' : '❌';
      const openIssues = feature.issues.filter(i => i.state === 'open').length;

      console.log(`  ${index + 1}. ${status} ${feature.name}`);
      console.log(`     📁 ${feature.worktreePath}`);
      const totalIssues = feature.issues.length;
      const issueText =
        totalIssues > 0
          ? `📋 ${openIssues} open issues, ${
              totalIssues - openIssues
            } completed`
          : `📋 No issues found (checked labels + title search)`;
      console.log(`     ${issueText}\n`);
    });

    const choice = await this.prompt(
      '🔍 Select feature (number) or type issue numbers (comma-separated): ',
    );

    // Check if it's a feature selection or issue numbers
    if (/^\d+$/.test(choice.trim())) {
      const featureIndex = parseInt(choice) - 1;
      if (featureIndex >= 0 && featureIndex < features.length) {
        await this.showFeatureDetails(features[featureIndex]);
        return;
      }
    }

    // Parse as issue numbers
    const issueNumbers = choice
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (issueNumbers.length === 0) {
      console.log('❌ Invalid selection');
      return;
    }

    const featureName = await this.prompt('📝 Feature name for these issues: ');

    await this.executeFeatureDevelopment(
      featureName,
      `Issues: ${issueNumbers.join(', ')}`,
      false,
      issueNumbers,
    );
  }

  private async showFeatureDetails(feature: FeatureStatus): Promise<void> {
    console.clear();
    console.log(`
🔍  Feature Details: ${feature.name}
====================================

🌿 Branch: ${feature.branch}
📁 Worktree: ${feature.worktreePath}
📊 Status: ${feature.exists ? '✅ Active' : '❌ Not Found'}
`);

    if (feature.project) {
      console.log(`📋 Project: ${feature.project}`);
    }

    // Sort issues by step number extracted from title
    const sortedIssues = [...feature.issues].sort((a, b) => {
      const stepA = this.extractStepNumber(a.title);
      const stepB = this.extractStepNumber(b.title);
      return stepA - stepB;
    });

    // Quick Reference Section
    console.log('📋 Quick Reference - Issue Numbers by Step:\n');
    if (sortedIssues.length > 0) {
      const openIssues = sortedIssues.filter(i => i.state === 'open');
      const closedIssues = sortedIssues.filter(i => i.state === 'closed');

      if (openIssues.length > 0) {
        console.log(
          '🔴 Open: ' + openIssues.map(i => `#${i.number}`).join(', '),
        );
      }
      if (closedIssues.length > 0) {
        console.log(
          '✅ Completed: ' + closedIssues.map(i => `#${i.number}`).join(', '),
        );
      }
    }

    console.log(
      `\n📋 All Issues by Step Order (${feature.issues.length} total):\n`,
    );

    if (sortedIssues.length > 0) {
      sortedIssues.forEach(issue => {
        const stepNum = this.extractStepNumber(issue.title);
        const stepText =
          stepNum !== 999
            ? `Step ${stepNum.toString().padStart(2, '0')}`
            : 'No Step';
        const stateIcon = issue.state === 'open' ? '🔴' : '✅';
        const progress = issue.inProgress ? ' 🚧' : '';
        const labels =
          issue.labels.length > 0 ? ` [${issue.labels.join(', ')}]` : '';

        console.log(
          `   ${stateIcon} #${issue.number
            .toString()
            .padStart(2, ' ')} | ${stepText} | ${
            issue.title
          }${labels}${progress}`,
        );
      });
    } else {
      console.log('   📭 No issues found');
    }

    // Summary
    const openCount = feature.issues.filter(i => i.state === 'open').length;
    const closedCount = feature.issues.filter(i => i.state === 'closed').length;
    console.log(`\n📊 Summary: ${openCount} open, ${closedCount} completed`);

    console.log('\n🔧 Actions:');
    console.log('  1. 🚀 Work on NEXT issue (lowest step number)');
    console.log('  2. 🎯 Work on specific single issue');
    console.log('  3. 📋 Work on ALL open issues');
    console.log('  4. ➕ Add new issues to this feature');
    console.log('  5. 📁 View worktree status');
    console.log('  6. 🔙 Back to main menu');

    const action = await this.prompt('\n🤖 Select action (1-6): ');

    switch (action) {
      case '1':
        await this.workOnNextIssue(feature, sortedIssues);
        break;
      case '2':
        await this.workOnSpecificIssue(feature, sortedIssues);
        break;
      case '3': {
        const openIssuesForWork = sortedIssues.filter(i => i.state === 'open');
        if (openIssuesForWork.length > 0) {
          const issues = openIssuesForWork.map((i: IssueStatus) => i.number);
          await this.executeFeatureDevelopment(
            feature.name,
            `All open issues for ${feature.name}`,
            false,
            issues,
          );
        } else {
          console.log('✅ No open issues found!');
        }
        break;
      }
      case '4':
        await this.handleAddIssues(feature.name);
        break;
      case '5':
        await this.showWorktreeStatus(feature.worktreePath);
        break;
    }
  }

  private async workOnNextIssue(
    feature: FeatureStatus,
    sortedIssues: IssueStatus[],
  ): Promise<void> {
    const openIssues = sortedIssues.filter(i => i.state === 'open');

    if (openIssues.length === 0) {
      console.log('✅ No open issues found!');
      return;
    }

    // Get the issue with the lowest step number (first in sorted array)
    const nextIssue = openIssues[0];
    const stepNum = this.extractStepNumber(nextIssue.title);
    const stepText = stepNum !== 999 ? `Step ${stepNum}` : 'No Step';

    console.log(`\n🚀 Next Issue to Work On:\n`);
    console.log(
      `   🎯 #${nextIssue.number} | ${stepText} | ${nextIssue.title}`,
    );

    if (nextIssue.labels.length > 0) {
      console.log(`   🏷️  Labels: ${nextIssue.labels.join(', ')}`);
    }

    const confirm = await this.prompt(
      `\n❓ Start working on issue #${nextIssue.number}? (y/N): `,
    );

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await this.executeFeatureDevelopment(
        feature.name,
        `Next issue: #${nextIssue.number} - ${nextIssue.title}`,
        false,
        [nextIssue.number],
      );
    } else {
      console.log('❌ Cancelled');
    }
  }

  private async workOnSpecificIssue(
    feature: FeatureStatus,
    sortedIssues: IssueStatus[],
  ): Promise<void> {
    const openIssues = sortedIssues.filter(i => i.state === 'open');

    if (openIssues.length === 0) {
      console.log('✅ No open issues found!');
      return;
    }

    console.log('\n🎯 Select Specific Issue to Work On:\n');

    openIssues.forEach((issue, index) => {
      const stepNum = this.extractStepNumber(issue.title);
      const stepText =
        stepNum !== 999
          ? `Step ${stepNum.toString().padStart(2, '0')}`
          : 'No Step';
      console.log(
        `  ${index + 1}. #${issue.number} | ${stepText} | ${issue.title}`,
      );
    });

    console.log(
      `\n💡 You can also enter the issue number directly (e.g., "${openIssues[0].number}")`,
    );

    const choice = await this.prompt(
      '\n🤖 Select issue (number from list or issue #): ',
    );

    let selectedIssue: IssueStatus | undefined;

    // Check if input is a list number (1, 2, 3, etc.)
    if (/^\d+$/.test(choice.trim())) {
      const choiceNum = parseInt(choice.trim());

      // First try as list index
      if (choiceNum >= 1 && choiceNum <= openIssues.length) {
        selectedIssue = openIssues[choiceNum - 1];
      } else {
        // Try as actual issue number
        selectedIssue = openIssues.find(issue => issue.number === choiceNum);
      }
    }

    if (!selectedIssue) {
      console.log('❌ Invalid selection');
      return;
    }

    const stepNum = this.extractStepNumber(selectedIssue.title);
    const stepText = stepNum !== 999 ? `Step ${stepNum}` : 'No Step';

    console.log(`\n🎯 Selected Issue:\n`);
    console.log(
      `   #${selectedIssue.number} | ${stepText} | ${selectedIssue.title}`,
    );

    const confirm = await this.prompt(
      `\n❓ Start working on this issue? (y/N): `,
    );

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await this.executeFeatureDevelopment(
        feature.name,
        `Single issue: #${selectedIssue.number} - ${selectedIssue.title}`,
        false,
        [selectedIssue.number],
      );
    } else {
      console.log('❌ Cancelled');
    }
  }

  private async handleAddIssues(featureName: string): Promise<void> {
    console.log('\n📝 Add Issues to Feature\n');

    const issueNumbers = await this.prompt(
      '📋 Issue numbers (comma-separated): ',
    );
    const issues = issueNumbers
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (issues.length === 0) {
      console.log('❌ No valid issue numbers provided');
      return;
    }

    // Add feature label to issues
    for (const issueNum of issues) {
      try {
        await GitHubUtils.addIssueLabel(
          issueNum,
          featureName,
          this.config.mainRepoPath,
        );
        console.log(`✅ Added ${featureName} label to issue #${issueNum}`);
      } catch (error) {
        console.log(`⚠️  Could not update issue #${issueNum}`);
      }
    }

    const workNow = await this.prompt('\n🔧 Work on these issues now? (y/N): ');

    if (workNow.toLowerCase() === 'y' || workNow.toLowerCase() === 'yes') {
      await this.executeFeatureDevelopment(
        featureName,
        `Added issues: ${issues.join(', ')}`,
        false,
        issues,
      );
    }
  }

  private async handleStatus(): Promise<void> {
    console.clear();
    console.log(`
📊  System Status
=================
`);

    // Check Claude Code availability
    console.log('🔑 Configuration:');
    console.log(
      `   Claude Code: ${
        (await this.checkClaudeCode()) ? '✅ Available' : '❌ Not Found'
      }`,
    );
    console.log(`   Main Repo: ${this.config.mainRepoPath}`);
    console.log(`   Worktree Base: ${this.config.baseWorktreePath}`);

    // Check git status
    try {
      const {stdout: gitStatus} = await execAsync('git status --porcelain', {
        cwd: this.config.mainRepoPath,
      });
      console.log(
        `   Git Status: ${
          gitStatus.trim() ? '⚠️  Uncommitted changes' : '✅ Clean'
        }`,
      );
    } catch {
      console.log('   Git Status: ❌ Error checking status');
    }

    // Show active features
    console.log('\n🌳 Active Features:');
    const features = await this.getExistingFeatures();

    if (features.length === 0) {
      console.log('   📭 No active features');
    } else {
      features.forEach(feature => {
        const status = feature.exists ? '✅' : '❌';
        const openIssues = feature.issues.filter(
          i => i.state === 'open',
        ).length;
        console.log(`   ${status} ${feature.name} (${openIssues} open issues)`);
      });
    }

    // Show recent issues
    console.log('\n📋 Recent Issues:');
    try {
      const {stdout} = await execAsync(
        'gh issue list --limit 5 --json number,title,state,labels',
        {
          cwd: this.config.mainRepoPath,
        },
      );

      const issues = JSON.parse(stdout);
      issues.forEach((issue: any) => {
        const stateIcon = issue.state.toLowerCase() === 'open' ? '🔴' : '✅';
        const labels = issue.labels.map((l: any) => l.name).join(', ');
        console.log(
          `   ${stateIcon} #${issue.number}: ${issue.title} ${
            labels ? `[${labels}]` : ''
          }`,
        );
      });
    } catch {
      console.log('   ❌ Could not fetch recent issues');
    }

    // Show worktrees
    console.log('\n🌳 Git Worktrees:');
    try {
      const {stdout} = await execAsync('git worktree list', {
        cwd: this.config.mainRepoPath,
      });

      const lines = stdout.trim().split('\n');
      lines.forEach(line => {
        const [path, branch] = line.split(/\s+/);
        const isMain = path === this.config.mainRepoPath;
        const icon = isMain ? '🏠' : '🌿';
        console.log(`   ${icon} ${path} (${branch || 'detached'})`);
      });
    } catch {
      console.log('   ❌ Could not list worktrees');
    }
  }

  private async handleWorktrees(): Promise<void> {
    console.clear();
    console.log(`
🌳  Worktree Management  
======================
`);

    try {
      const {stdout} = await execAsync('git worktree list', {
        cwd: this.config.mainRepoPath,
      });

      const lines = stdout.trim().split('\n');
      const worktrees = lines.map(line => {
        const parts = line.split(/\s+/);
        return {
          path: parts[0],
          branch: parts[1] || 'detached',
          isMain: parts[0] === this.config.mainRepoPath,
        };
      });

      console.log('📁 Current Worktrees:\n');

      worktrees.forEach((wt, index) => {
        const icon = wt.isMain ? '🏠' : '🌿';
        const status = wt.isMain ? ' (main)' : '';
        console.log(`  ${index + 1}. ${icon} ${wt.path}${status}`);
        console.log(`     Branch: ${wt.branch}\n`);
      });

      console.log('🔧 Actions:');
      console.log('  1. Create new worktree');
      console.log('  2. Remove worktree');
      console.log('  3. Clean up unused worktrees');
      console.log('  4. 🧹 Clean up local branches');
      console.log('  5. 📊 View all branches status');
      console.log('  6. Back to main menu');

      const action = await this.prompt('\n🤖 Select action (1-6): ');

      switch (action) {
        case '1':
          await this.createWorktree();
          break;
        case '2':
          await this.removeWorktree(worktrees.filter(w => !w.isMain));
          break;
        case '3':
          await this.cleanupWorktrees();
          break;
        case '4':
          await this.handleBranchCleanup();
          break;
        case '5':
          await this.showAllBranchesStatus();
          break;
      }
    } catch (error) {
      console.log('❌ Could not list worktrees:', error);
    }
  }

  private async createWorktree(): Promise<void> {
    const featureName = await this.prompt(
      '\n📝 Feature name for new worktree: ',
    );
    const branchName = `feature/${featureName}`;
    const worktreePath = path.join(
      this.config.baseWorktreePath,
      `${this.getProjectName()}-${featureName}`,
    );

    try {
      // Check if branch exists locally
      let branchExists = false;
      branchExists = await GitUtils.branchExists(
        branchName,
        this.config.mainRepoPath,
      );

      if (branchExists) {
        // Branch exists, just checkout
        await GitUtils.checkout(branchName, this.config.mainRepoPath);
      } else {
        // Branch doesn't exist, create it
        await GitUtils.createBranch(branchName, this.config.mainRepoPath);
      }

      // Create worktree
      await GitUtils.addWorktree(
        worktreePath,
        branchName,
        this.config.mainRepoPath,
      );

      console.log(`✅ Created worktree: ${worktreePath}`);
      console.log(`🌿 Branch: ${branchName}`);
    } catch (error) {
      console.log('❌ Failed to create worktree:', error);
    }
  }

  private async removeWorktree(worktrees: any[]): Promise<void> {
    if (worktrees.length === 0) {
      console.log('📭 No additional worktrees to remove');
      return;
    }

    console.log('\n🗑️  Select worktree to remove:\n');

    worktrees.forEach((wt, index) => {
      console.log(`  ${index + 1}. ${wt.path} (${wt.branch})`);
    });

    const choice = await this.prompt('\n🤖 Select worktree number: ');
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < worktrees.length) {
      const worktree = worktrees[index];
      const confirm = await this.prompt(`❓ Remove ${worktree.path}? (y/N): `);

      if (confirm.toLowerCase() === 'y') {
        try {
          await execAsync(`git worktree remove ${worktree.path}`, {
            cwd: this.config.mainRepoPath,
          });
          console.log(`✅ Removed worktree: ${worktree.path}`);
        } catch (error) {
          // If removal failed due to uncommitted changes, ask for confirmation before forcing
          console.log(`⚠️  Worktree contains uncommitted changes!`);
          const forceConfirm = await this.prompt(
            `🚨 Force remove and lose changes? (y/N): `,
          );

          if (forceConfirm.toLowerCase() === 'y') {
            try {
              await execAsync(`git worktree remove --force ${worktree.path}`, {
                cwd: this.config.mainRepoPath,
              });
              console.log(`✅ Force-removed worktree: ${worktree.path}`);
            } catch (forceError) {
              console.log(
                '❌ Failed to remove worktree even with --force:',
                forceError,
              );
            }
          } else {
            console.log(
              '❌ Worktree removal cancelled. Commit or stash changes first.',
            );
          }
        }
      }
    }
  }

  private async cleanupWorktrees(): Promise<void> {
    try {
      const {stdout} = await execAsync('git worktree prune', {
        cwd: this.config.mainRepoPath,
      });
      console.log('✅ Cleaned up unused worktrees');
      if (stdout.trim()) {
        console.log(stdout);
      }
    } catch (error) {
      console.log('❌ Failed to cleanup worktrees:', error);
    }
  }

  private async handleBranchCleanup(): Promise<void> {
    console.clear();
    console.log(`
🧹  Branch Cleanup Utility
==========================
`);

    console.log('🔍 Analyzing branches...\n');

    try {
      // Get branch information
      const {stdout: _localBranches} = await execAsync('git branch -vv', {
        cwd: this.config.mainRepoPath,
      });

      const {stdout: mergedToMain} = await execAsync(
        'git branch --merged main',
        {
          cwd: this.config.mainRepoPath,
        },
      );

      const {stdout: mergedToDev} = await execAsync('git branch --merged dev', {
        cwd: this.config.mainRepoPath,
      }).catch(() => ({stdout: ''}));

      // Parse merged branches
      const mergedMainBranches = mergedToMain
        .split('\n')
        .map(b => b.trim().replace('* ', ''))
        .filter(b => b && !['main', 'dev', 'master'].includes(b));

      const mergedDevBranches = mergedToDev
        .split('\n')
        .map(b => b.trim().replace('* ', ''))
        .filter(b => b && !['main', 'dev', 'master'].includes(b));

      const mergedBranches = [
        ...new Set([...mergedMainBranches, ...mergedDevBranches]),
      ];

      console.log('🔧 Cleanup Options:\n');
      console.log('  1. 🧹 Delete branches merged to main/dev (safe)');
      console.log('  2. 🗑️  Delete specific branches (interactive)');
      console.log('  3. 📡 Clean up remote tracking references');
      console.log('  4. 🔄 Full cleanup (merged branches + remote references)');
      console.log('  5. 📋 Just show what would be deleted');
      console.log('  6. Back to worktree menu');

      const choice = await this.prompt('\n🤖 Select cleanup option (1-6): ');

      switch (choice) {
        case '1':
          await this.deleteMergedBranches(mergedBranches);
          break;
        case '2':
          await this.deleteSpecificBranches();
          break;
        case '3':
          await this.cleanupRemoteReferences();
          break;
        case '4':
          await this.fullBranchCleanup(mergedBranches);
          break;
        case '5':
          await this.previewCleanup(mergedBranches);
          break;
      }
    } catch (error) {
      console.log('❌ Failed to analyze branches:', error);
    }
  }

  private async deleteMergedBranches(mergedBranches: string[]): Promise<void> {
    if (mergedBranches.length === 0) {
      console.log('✅ No merged branches found to delete!');
      return;
    }

    console.log(
      `\n🔍 Found ${mergedBranches.length} branches merged to main/dev:\n`,
    );
    mergedBranches.forEach(branch => console.log(`   • ${branch}`));

    const confirm = await this.prompt(
      '\n❓ Delete these merged branches? (y/N): ',
    );

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      let deleted = 0;
      for (const branch of mergedBranches) {
        try {
          await execAsync(`git branch -d "${branch}"`, {
            cwd: this.config.mainRepoPath,
          });
          console.log(`✅ Deleted: ${branch}`);
          deleted++;
        } catch (error) {
          console.log(`❌ Failed to delete ${branch}: ${error}`);
        }
      }
      console.log(
        `\n🎉 Successfully deleted ${deleted}/${mergedBranches.length} branches`,
      );
    } else {
      console.log('❌ Cleanup cancelled');
    }
  }

  private async deleteSpecificBranches(): Promise<void> {
    try {
      const {stdout} = await execAsync('git branch', {
        cwd: this.config.mainRepoPath,
      });

      const branches = stdout
        .split('\n')
        .map(b => b.trim().replace('* ', ''))
        .filter(b => b && !['main', 'dev', 'master'].includes(b));

      if (branches.length === 0) {
        console.log('📭 No branches available for deletion');
        return;
      }

      console.log('\n📋 Available branches:\n');
      branches.forEach((branch, index) => {
        console.log(`  ${index + 1}. ${branch}`);
      });

      const selection = await this.prompt(
        '\n🔍 Enter branch numbers to delete (comma-separated) or branch names: ',
      );

      let branchesToDelete: string[] = [];

      // Check if input is numbers or names
      if (/^\d+(,\d+)*$/.test(selection.trim())) {
        const indices = selection.split(',').map(n => parseInt(n.trim()) - 1);
        branchesToDelete = indices
          .filter(i => i >= 0 && i < branches.length)
          .map(i => branches[i]);
      } else {
        branchesToDelete = selection
          .split(',')
          .map(b => b.trim())
          .filter(b => b);
      }

      if (branchesToDelete.length === 0) {
        console.log('❌ No valid branches selected');
        return;
      }

      console.log('\n🗑️  Will delete:');
      branchesToDelete.forEach(branch => console.log(`   • ${branch}`));

      const confirm = await this.prompt('\n❓ Confirm deletion? (y/N): ');

      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        for (const branch of branchesToDelete) {
          try {
            // Try soft delete first, then force if needed
            try {
              await execAsync(`git branch -d "${branch}"`, {
                cwd: this.config.mainRepoPath,
              });
              console.log(`✅ Deleted: ${branch}`);
            } catch {
              const forceConfirm = await this.prompt(
                `⚠️  ${branch} is not merged. Force delete? (y/N): `,
              );
              if (forceConfirm.toLowerCase() === 'y') {
                await execAsync(`git branch -D "${branch}"`, {
                  cwd: this.config.mainRepoPath,
                });
                console.log(`✅ Force deleted: ${branch}`);
              } else {
                console.log(`⏭️  Skipped: ${branch}`);
              }
            }
          } catch (error) {
            console.log(`❌ Failed to delete ${branch}: ${error}`);
          }
        }
      }
    } catch (error) {
      console.log('❌ Failed to get branch list:', error);
    }
  }

  private async cleanupRemoteReferences(): Promise<void> {
    console.log('\n📡 Cleaning up remote tracking references...\n');

    try {
      const {stdout} = await execAsync('git remote prune origin', {
        cwd: this.config.mainRepoPath,
      });

      console.log('✅ Remote reference cleanup completed');
      if (stdout.trim()) {
        console.log('Removed references:');
        console.log(stdout);
      } else {
        console.log('No stale references found');
      }
    } catch (error) {
      console.log('❌ Failed to clean remote references:', error);
    }
  }

  private async fullBranchCleanup(mergedBranches: string[]): Promise<void> {
    console.log('\n🔄 Full Branch Cleanup\n');
    console.log('This will:');
    console.log('1. Delete all merged branches');
    console.log('2. Clean up remote tracking references');

    const confirm = await this.prompt(
      '\n❓ Proceed with full cleanup? (y/N): ',
    );

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await this.deleteMergedBranches(mergedBranches);
      console.log('\n📡 Cleaning remote references...');
      await this.cleanupRemoteReferences();
      console.log('\n🎉 Full cleanup completed!');
    } else {
      console.log('❌ Full cleanup cancelled');
    }
  }

  private async previewCleanup(mergedBranches: string[]): Promise<void> {
    console.log('\n📋 Cleanup Preview\n');

    console.log('🧹 Branches that would be deleted (merged to main/dev):');
    if (mergedBranches.length > 0) {
      mergedBranches.forEach(branch => console.log(`   • ${branch}`));
    } else {
      console.log('   (none)');
    }

    console.log('\n📡 Remote references cleanup:');
    try {
      const {stdout} = await execAsync('git remote prune origin --dry-run', {
        cwd: this.config.mainRepoPath,
      });

      if (stdout.trim()) {
        console.log('   Would remove:');
        console.log(stdout);
      } else {
        console.log('   (no stale references)');
      }
    } catch {
      console.log('   (unable to check)');
    }

    console.log('\n💡 Use options 1-4 to actually perform cleanup operations.');
  }

  private async showAllBranchesStatus(): Promise<void> {
    console.clear();
    console.log(`
📊  All Branches Status
======================
`);

    try {
      console.log('🌿 Local Branches:\n');
      const {stdout: _localBranches} = await execAsync('git branch -vv', {
        cwd: this.config.mainRepoPath,
      });
      console.log(_localBranches);

      console.log('\n🌐 Remote Branches:\n');
      const {stdout: remoteBranches} = await execAsync('git branch -r', {
        cwd: this.config.mainRepoPath,
      });
      console.log(remoteBranches);

      console.log('\n🔄 Merged Status:\n');

      try {
        const {stdout: mergedToMain} = await execAsync(
          'git branch --merged main',
          {
            cwd: this.config.mainRepoPath,
          },
        );
        console.log('Merged to main:');
        console.log(mergedToMain);
      } catch {
        console.log('Could not check main branch merges');
      }

      try {
        const {stdout: mergedToDev} = await execAsync(
          'git branch --merged dev',
          {
            cwd: this.config.mainRepoPath,
          },
        );
        console.log('\nMerged to dev:');
        console.log(mergedToDev);
      } catch {
        console.log('Could not check dev branch merges');
      }
    } catch (error) {
      console.log('❌ Failed to get branch status:', error);
    }
  }

  private async handleConfig(): Promise<void> {
    console.clear();
    console.log(`
⚙️  Configuration
=================

Current Settings:
🔧 Claude Code: ${
      (await this.checkClaudeCode()) ? '✅ Available' : '❌ Not Found'
    }
📁 Main Repo: ${this.config.mainRepoPath}  
🌳 Worktree Base: ${this.config.baseWorktreePath}
🌿 Base Branch: ${this.config.baseBranch || 'Auto-detect (main/master)'}
🔧 Max Concurrent Tasks: ${this.config.maxConcurrentTasks}
👥 Required Approvals: ${this.config.requiredApprovals}
🎭 Reviewer Profiles: ${this.config.reviewerProfiles.join(', ')}
`);

    console.log('🔧 Configuration Actions:');
    console.log('  1. Check Claude Code setup');
    console.log('  2. Update paths');
    console.log('  3. Set base branch');
    console.log('  4. Adjust task limits');
    console.log('  5. Test configuration');
    console.log('  6. Back to main menu');

    const action = await this.prompt('\n🤖 Select action (1-6): ');

    switch (action) {
      case '1':
        await this.checkClaudeCodeSetup();
        break;
      case '2':
        await this.updatePaths();
        break;
      case '3':
        await this.setBaseBranch();
        break;
      case '4':
        await this.adjustLimits();
        break;
      case '5':
        await this.testConfiguration();
        break;
      case '6':
        return; // Back to main menu
    }
  }

  private async checkClaudeCodeSetup(): Promise<void> {
    console.log('\n🔧 Claude Code Setup Check\n');

    const isAvailable = await this.checkClaudeCode();

    if (isAvailable) {
      console.log('✅ Claude Code is installed and available');

      // Test Claude Code connection
      if (await ClaudeUtils.testConnection(this.config.mainRepoPath)) {
        console.log(`📍 Claude Code: Connection test successful`);
      } else {
        console.log(`⚠️ Claude Code: Connection test failed`);
      }

      try {
        const {stdout} = await execAsync('which claude');
        console.log(`📁 Location: ${stdout.trim()}`);
      } catch {
        // Claude test failed or which prompt not found
      }
    } else {
      console.log('❌ Claude Code not found in PATH');
      console.log('\n📥 Installation Instructions:');
      console.log('1. Visit https://claude.ai/code');
      console.log('2. Download and install Claude Code CLI');
      console.log("3. Ensure it's in your PATH");
      console.log(
        '4. Test with: echo "Hello, please respond with test works" | claude code --dangerously-skip-permissions',
      );
      console.log(
        '\n💡 You need Claude Code (not API credits) to use this system',
      );
    }
  }

  private async updatePaths(): Promise<void> {
    console.log(`\nCurrent paths:
📁 Main Repo: ${this.config.mainRepoPath}
🌳 Worktree Base: ${this.config.baseWorktreePath}
`);

    const updateMain = await this.prompt(
      '📝 New main repo path (or press Enter to keep current): ',
    );
    if (updateMain.trim()) {
      this.config.mainRepoPath = updateMain.trim();
    }

    const updateWorktree = await this.prompt(
      '📝 New worktree base path (or press Enter to keep current): ',
    );
    if (updateWorktree.trim()) {
      this.config.baseWorktreePath = updateWorktree.trim();
    }

    console.log('✅ Paths updated');
  }

  private getConfigFilePath(): string {
    return path.join(
      this.config.mainRepoPath,
      '.codettea',
      'multi-agent-config.json',
    );
  }

  private async loadProjectConfig(): Promise<void> {
    try {
      const configPath = this.getConfigFilePath();
      const configData = await fs.readFile(configPath, 'utf-8');
      const projectConfig = JSON.parse(configData);

      // Merge project-specific config with defaults
      if (projectConfig.baseBranch) {
        this.config.baseBranch = projectConfig.baseBranch;
      }
      if (projectConfig.maxConcurrentTasks) {
        this.config.maxConcurrentTasks = projectConfig.maxConcurrentTasks;
      }
      if (projectConfig.requiredApprovals) {
        this.config.requiredApprovals = projectConfig.requiredApprovals;
      }

      console.log(`✅ Loaded project-specific config from ${configPath}`);
    } catch (error) {
      // Config file doesn't exist or is invalid - that's fine, use defaults
    }
  }

  private async saveProjectConfig(): Promise<void> {
    try {
      const configPath = this.getConfigFilePath();
      const configDir = path.dirname(configPath);

      // Ensure .codettea directory exists
      await fs.mkdir(configDir, {recursive: true});

      const projectConfig = {
        baseBranch: this.config.baseBranch,
        maxConcurrentTasks: this.config.maxConcurrentTasks,
        requiredApprovals: this.config.requiredApprovals,
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(configPath, JSON.stringify(projectConfig, null, 2));
      console.log(`✅ Saved project config to ${configPath}`);
    } catch (error) {
      console.log(`⚠️  Could not save project config: ${error}`);
    }
  }

  private async setBaseBranch(): Promise<void> {
    console.log(`\n🌿 Base Branch Configuration
=====================================

Current base branch: ${this.config.baseBranch || 'Auto-detect (main/master)'}
Project: ${this.selectedProject}

The base branch is where feature branches are created from and merged back to.
Different projects use different conventions:
• Most projects: 'main' or 'master'  
• Some projects: 'dev' or 'develop'
• Enterprise: 'integration' or 'staging'
`);

    try {
      // Try to detect current branches in the repo
      const {stdout} = await execAsync('git branch -r', {
        cwd: this.config.mainRepoPath,
      });
      const remoteBranches = stdout
        .split('\n')
        .map(line => line.trim().replace('origin/', ''))
        .filter(branch => branch && !branch.includes('->'))
        .slice(0, 10); // Limit to first 10 branches

      console.log('🌐 Available remote branches:');
      remoteBranches.forEach((branch, index) => {
        const isCommon = ['main', 'master', 'dev', 'develop'].includes(branch);
        const marker = isCommon ? '⭐' : '  ';
        console.log(`${marker} ${branch}`);
      });
    } catch (error) {
      console.log('⚠️  Could not fetch remote branches');
    }

    const input = await this.prompt(
      '\n📝 Enter base branch name (or press Enter for auto-detect): ',
    );
    const trimmed = input.trim();

    if (trimmed) {
      this.config.baseBranch = trimmed;
      console.log(`✅ Base branch set to: ${trimmed}`);
    } else {
      this.config.baseBranch = undefined;
      console.log('✅ Base branch set to auto-detect');
    }

    // Save the configuration
    await this.saveProjectConfig();
  }

  private async adjustLimits(): Promise<void> {
    console.log(`\nCurrent limits:
🔧 Max Concurrent Tasks: ${this.config.maxConcurrentTasks}
👥 Required Approvals: ${this.config.requiredApprovals}
`);

    const maxTasks = await this.prompt('📝 Max concurrent tasks (1-5): ');
    const parsedTasks = parseInt(maxTasks);
    if (!isNaN(parsedTasks) && parsedTasks >= 1 && parsedTasks <= 5) {
      this.config.maxConcurrentTasks = parsedTasks;
    }

    const approvals = await this.prompt('📝 Required approvals (1-5): ');
    const parsedApprovals = parseInt(approvals);
    if (
      !isNaN(parsedApprovals) &&
      parsedApprovals >= 1 &&
      parsedApprovals <= 5
    ) {
      this.config.requiredApprovals = parsedApprovals;
    }

    console.log('✅ Limits updated');

    // Save the configuration
    await this.saveProjectConfig();
  }

  private async testConfiguration(): Promise<void> {
    console.log('\n🧪 Testing Configuration...\n');

    // Test Claude Code
    if (await this.checkClaudeCode()) {
      console.log('✅ Claude Code: Available');
    } else {
      console.log('❌ Claude Code: Not found in PATH');
    }

    // Test main repo
    try {
      await fs.access(this.config.mainRepoPath);
      const {stdout: _stdout} = await execAsync('git status', {
        cwd: this.config.mainRepoPath,
      });
      console.log('✅ Main Repo: Accessible and is git repository');
    } catch {
      console.log('❌ Main Repo: Not accessible or not a git repository');
    }

    // Test worktree base
    try {
      await fs.access(this.config.baseWorktreePath);
      console.log('✅ Worktree Base: Accessible');
    } catch {
      console.log('❌ Worktree Base: Not accessible');
    }

    // Test GitHub CLI
    if (await GitHubUtils.checkAuth(this.config.mainRepoPath)) {
      console.log('✅ GitHub CLI: Authenticated');
    } else {
      console.log('❌ GitHub CLI: Not authenticated');
    }

    console.log('\n📊 Configuration test complete');
  }

  private async executeFeatureDevelopment(
    featureName: string,
    description: string,
    isArchMode: boolean,
    issues?: number[],
  ): Promise<void> {
    console.log(
      `\n🚀 Starting ${
        isArchMode ? 'full feature development' : 'issue implementation'
      }...\n`,
    );

    // Use configured base branch or auto-detect
    const baseBranch =
      this.config.baseBranch ||
      (await getDefaultBranch(this.config.mainRepoPath));

    const spec: FeatureSpec = {
      name: featureName,
      description,
      baseBranch,
      issues: isArchMode ? undefined : issues,
      isParentFeature: true,
      architectureMode: isArchMode,
    };

    try {
      const orchestrator = new MultiAgentFeatureOrchestrator(
        this.config,
        featureName,
        this.selectedProject,
      );
      await orchestrator.executeFeature(spec);

      console.log('\n🎉 Feature development completed successfully!');
    } catch (error) {
      console.error('\n💥 Feature development failed:', error);
    }
  }

  private async getExistingFeatures(): Promise<FeatureStatus[]> {
    const features: FeatureStatus[] = [];

    try {
      // Get active feature branches (both local and remote)
      const {stdout: remoteBranches} = await execAsync(
        'git branch -r --no-merged',
        {cwd: this.config.mainRepoPath},
      );
      const {stdout: localBranches} = await execAsync('git branch', {
        cwd: this.config.mainRepoPath,
      });

      // Combine and deduplicate branches
      const allBranches = [
        ...remoteBranches.split('\n'),
        ...localBranches.split('\n'),
      ];
      const branches = allBranches
        .filter(line => line.includes('feature/'))
        .map(line => line.trim().replace('origin/', '').replace('* ', ''))
        .filter(branch => branch.startsWith('feature/'))
        .filter((branch, index, arr) => arr.indexOf(branch) === index); // deduplicate

      for (const branch of branches) {
        const featureName = branch.replace('feature/', '');
        const projectName =
          this.selectedProject || path.basename(this.config.mainRepoPath);
        const worktreePath = path.join(
          this.config.baseWorktreePath,
          `${projectName}-${featureName}`,
        );

        // Check if worktree exists
        let exists = false;
        try {
          await fs.access(worktreePath);
          exists = true;
        } catch {
          // Claude test failed or which command not found
        }

        // Get issues for this feature
        const issues = await this.getFeatureIssues(featureName);

        features.push({
          name: featureName,
          branch,
          worktreePath,
          exists,
          issues,
        });
      }
    } catch (error) {
      console.warn('Could not fetch existing features:', error);
    }

    return features;
  }

  private async getFeatureIssues(featureName: string): Promise<IssueStatus[]> {
    try {
      // First try to get issues by label
      let issues: IssueStatus[] = [];

      try {
        const {stdout} = await execAsync(
          `gh issue list --label "${featureName}" --limit 50 --json number,title,state,labels,assignees`,
          {cwd: this.config.mainRepoPath},
        );
        const rawIssues = JSON.parse(stdout);

        issues = rawIssues.map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state.toLowerCase(), // Normalize to lowercase
          labels: issue.labels.map((l: any) => l.name),
          assignees: issue.assignees.map((a: any) => a.login),
          inProgress: issue.labels.some((l: any) => l.name === 'in-progress'),
        }));
      } catch {
        // Claude test failed or which command not found
      }

      // Fallback: search for issues with feature name in title if no labeled issues found
      if (issues.length === 0) {
        try {
          const {stdout} = await execAsync(
            `gh issue list --search "${featureName} in:title" --limit 20 --json number,title,state,labels,assignees`,
            {cwd: this.config.mainRepoPath},
          );
          const rawSearchResults = JSON.parse(stdout);

          const searchResults = rawSearchResults.map((issue: any) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state.toLowerCase(), // Normalize to lowercase
            labels: issue.labels.map((l: any) => l.name),
            assignees: issue.assignees.map((a: any) => a.login),
            inProgress: issue.labels.some((l: any) => l.name === 'in-progress'),
          }));

          // Filter to only issues that actually contain the feature name
          issues = searchResults.filter((issue: IssueStatus) =>
            issue.title.toLowerCase().includes(featureName.toLowerCase()),
          );
        } catch {
          // Claude test failed or which command not found
        }
      }

      // Debug can be enabled if needed
      // console.log(`📊 Debug: Final result for ${featureName}: ${issues.length} total issues`);
      // const openCount = issues.filter(i => i.state === 'open').length;
      // const closedCount = issues.filter(i => i.state === 'closed').length;
      // console.log(`   Open: ${openCount}, Closed: ${closedCount}`);

      return issues;
    } catch {
      return [];
    }
  }

  private async showWorktreeStatus(worktreePath: string): Promise<void> {
    console.log(`\n📁 Worktree Status: ${worktreePath}\n`);

    try {
      const {stdout: status} = await execAsync('git status --short', {
        cwd: worktreePath,
      });
      const {stdout: branch} = await execAsync('git branch --show-current', {
        cwd: worktreePath,
      });

      console.log(`🌿 Current Branch: ${branch.trim()}`);

      if (status.trim()) {
        console.log('📝 Working Directory Changes:');
        console.log(status);
      } else {
        console.log('✅ Working directory clean');
      }

      // Show recent commits
      const {stdout: log} = await execAsync('git log --oneline -5', {
        cwd: worktreePath,
      });
      console.log('\n📚 Recent Commits:');
      console.log(log);
    } catch (error) {
      console.log('❌ Could not access worktree:', error);
    }
  }

  private extractStepNumber(title: string): number {
    // Try to extract step number from patterns like:
    // "promotion-builder-v2 - Step 2: Finalize promotion data models"
    // "Step 10: Create something"
    // "promotion-builder-v2 - Step 15: Configure CMS outlets data"

    const stepMatch = title.match(/step\s+(\d+)/i);
    return stepMatch ? parseInt(stepMatch[1], 10) : 999; // Put non-step issues at the end
  }

  private isValidFeatureName(name: string): boolean {
    return /^[a-z0-9-]+$/.test(name) && name.length >= 2 && name.length <= 50;
  }

  private async prompt(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  private async waitForUser(message: string): Promise<void> {
    await this.prompt(message);
  }

  private async checkClaudeCode(): Promise<boolean> {
    return await ClaudeUtils.checkAvailability();
  }

  private getProjectName(): string {
    return path.basename(this.config.mainRepoPath);
  }
}

async function main() {
  const cli = new InteractiveMultiAgentCLI();
  await cli.start();
}

export {InteractiveMultiAgentCLI};

if (require.main === module) {
  main().catch(console.error);
}
