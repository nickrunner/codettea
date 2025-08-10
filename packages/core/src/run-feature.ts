#!/usr/bin/env tsx

import { exec } from 'child_process';
import { promisify } from 'util';
import { MultiAgentFeatureOrchestrator, FeatureSpec } from './orchestrator';
import path from 'path';

const execAsync = promisify(exec);

// Auto-detect the default branch for a repository
async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    // Try to get the default branch from remote
    const { stdout } = await execAsync('git symbolic-ref refs/remotes/origin/HEAD', { cwd: repoPath });
    return stdout.trim().replace('refs/remotes/origin/', '');
  } catch {
    // Fallback: check for common default branches
    try {
      await execAsync('git rev-parse --verify main', { cwd: repoPath });
      return 'main';
    } catch {
      try {
        await execAsync('git rev-parse --verify master', { cwd: repoPath });
        return 'master';
      } catch {
        // Ultimate fallback
        return 'main';
      }
    }
  }
}

// Dynamic configuration based on project parameter
function getProjectConfig(projectPath?: string) {
  const mainRepoPath = projectPath || process.cwd();
  const baseWorktreePath = path.dirname(mainRepoPath);
  
  return {
    mainRepoPath,
    baseWorktreePath,
    maxConcurrentTasks: 1, // Adjust based on your system capacity
    requiredApprovals: 3,
    reviewerProfiles: [
      'frontend',
      'backend', 
      'devops'
    ]
  };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error(`
Usage: 
  # Architecture + Implementation (full feature development)
  ./run-feature.ts <feature-name> "<feature-description>" --arch [--project <path>] [--base-branch <branch>]

  # Work on existing feature with specific issues  
  ./run-feature.ts <feature-name> <issue-numbers...> [--parent-feature] [--project <path>] [--base-branch <branch>]

Examples:
  # Full feature development (architecture + implementation)
  ./run-feature.ts user-auth "Implement user authentication with JWT tokens and password reset" --arch

  # Work on existing feature branch with specific issues
  ./run-feature.ts user-management 123 124 125

  # Create new feature branch and work on specific issues  
  ./run-feature.ts payment-system 130 131 132 --parent-feature

  # Single issue on existing feature
  ./run-feature.ts dashboard-updates 140
  
  # Specify a different project path
  ./run-feature.ts new-feature "Description" --arch --project /path/to/project
  
  # Specify base branch (defaults to main, or auto-detected)
  ./run-feature.ts feature-name "Description" --arch --base-branch main
`);
    process.exit(1);
  }

  const featureName = args[0];
  const isArchMode = args.includes('--arch');
  const isParentFeature = args.includes('--parent-feature') || isArchMode;
  
  // Extract project path if provided
  const projectIndex = args.indexOf('--project');
  const projectPath = projectIndex !== -1 && args[projectIndex + 1] ? args[projectIndex + 1] : undefined;
  
  // Extract base branch if provided
  const baseBranchIndex = args.indexOf('--base-branch');
  const explicitBaseBranch = baseBranchIndex !== -1 && args[baseBranchIndex + 1] ? args[baseBranchIndex + 1] : undefined;
  
  let description = '';
  let issueNumbers: number[] = [];

  if (isArchMode) {
    // Architecture mode - expect description as second argument
    if (args.length < 2) {
      console.error('❌ Architecture mode requires a feature description');
      process.exit(1);
    }
    description = args[1];
  } else {
    // Issue mode - expect issue numbers
    issueNumbers = args
      .filter(arg => !isNaN(Number(arg)) && arg !== '--parent-feature' && arg !== '--project' && arg !== projectPath && arg !== '--base-branch' && arg !== explicitBaseBranch)
      .map(Number);

    if (issueNumbers.length === 0) {
      console.error('❌ No valid issue numbers provided (use --arch for architecture mode)');
      process.exit(1);
    }
    description = `Implementation of issues: ${issueNumbers.join(', ')}`;
  }

  // Check if Claude Code is available
  try {
    // Claude Code doesn't have --version, test with a simple command
    await execAsync('echo "Hello, please respond with test works" | claude code --dangerously-skip-permissions', { timeout: 5000 });
    console.log('✅ Claude Code CLI detected');
  } catch {
    console.error(`❌ Claude Code CLI not found. Please ensure it's installed and in your PATH.
    
Install Claude Code:
1. Visit https://claude.ai/code
2. Follow installation instructions
3. Verify with: echo "Hello, please respond with test works" | claude code --dangerously-skip-permissions`);
    process.exit(1);
  }

  // Get dynamic configuration
  const config = getProjectConfig(projectPath);
  
  // Get project name from the repo path
  const projectName = path.basename(config.mainRepoPath);

  // Determine base branch
  const baseBranch = explicitBaseBranch || await getDefaultBranch(config.mainRepoPath);

  // Create feature specification
  const featureSpec: FeatureSpec = {
    name: featureName,
    description: description,
    baseBranch: isParentFeature ? baseBranch : `feature/${featureName}`,
    issues: isArchMode ? undefined : issueNumbers,
    isParentFeature,
    architectureMode: isArchMode
  };

  console.log(`
🤖 Multi-Agent Feature Development System
==========================================
Project: ${projectName}
Project Path: ${config.mainRepoPath}
Feature: ${featureSpec.name}
Description: ${featureSpec.description}
Mode: ${isArchMode ? 'Architecture + Implementation' : 'Issue Implementation'}
Issues: ${isArchMode ? 'Will be created by architect agent' : issueNumbers.join(', ')}
Base Branch: ${featureSpec.baseBranch}
Parent Feature: ${isParentFeature ? 'Yes' : 'No'}
Worktree: ${config.baseWorktreePath}/${projectName}-${featureName}
Max Concurrent Tasks: ${config.maxConcurrentTasks}
Required Approvals: ${config.requiredApprovals}
`);

  try {
    const orchestrator = new MultiAgentFeatureOrchestrator(config, featureName, projectName);
    await orchestrator.executeFeature(featureSpec);
    
    console.log('🎉 Feature development completed successfully!');
    
  } catch (error) {
    console.error('💥 Feature development failed:', error);
    process.exit(1);
  }
}

export { main };

if (require.main === module) {
  main().catch(console.error);
}