#!/usr/bin/env tsx

import { exec } from 'child_process';
import { promisify } from 'util';
import { MultiAgentFeatureOrchestrator, FeatureSpec } from './orchestrator';
// import path from 'path'; // Currently unused

const execAsync = promisify(exec);

// Configuration
const config = {
  mainRepoPath: '/Users/nickschrock/git/stays',
  baseWorktreePath: '/Users/nickschrock/git',
  maxConcurrentTasks: 2, // Adjust based on your system capacity
  requiredApprovals: 3,
  reviewerProfiles: [
    'frontend',
    'backend', 
    'devops'
  ]
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error(`
Usage: 
  # Architecture + Implementation (full feature development)
  ./run-feature.ts <feature-name> "<feature-description>" --arch

  # Work on existing feature with specific issues  
  ./run-feature.ts <feature-name> <issue-numbers...> [--parent-feature]

Examples:
  # Full feature development (architecture + implementation)
  ./run-feature.ts user-auth "Implement user authentication with JWT tokens and password reset" --arch

  # Work on existing feature branch with specific issues
  ./run-feature.ts user-management 123 124 125

  # Create new feature branch and work on specific issues  
  ./run-feature.ts payment-system 130 131 132 --parent-feature

  # Single issue on existing feature
  ./run-feature.ts dashboard-updates 140
`);
    process.exit(1);
  }

  const featureName = args[0];
  const isArchMode = args.includes('--arch');
  const isParentFeature = args.includes('--parent-feature') || isArchMode;
  
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
      .filter(arg => !isNaN(Number(arg)) && arg !== '--parent-feature')
      .map(Number);

    if (issueNumbers.length === 0) {
      console.error('❌ No valid issue numbers provided (use --arch for architecture mode)');
      process.exit(1);
    }
    description = `Implementation of issues: ${issueNumbers.join(', ')}`;
  }

  // Check if Claude Code is available
  try {
    await execAsync('claude --version');
    console.log('✅ Claude Code CLI detected');
  } catch {
    console.error(`❌ Claude Code CLI not found. Please ensure it's installed and in your PATH.
    
Install Claude Code:
1. Visit https://claude.ai/code
2. Follow installation instructions
3. Verify with: claude --version`);
    process.exit(1);
  }

  // Create feature specification
  const featureSpec: FeatureSpec = {
    name: featureName,
    description: description,
    baseBranch: isParentFeature ? 'dev' : `feature/${featureName}`,
    issues: isArchMode ? undefined : issueNumbers,
    isParentFeature,
    architectureMode: isArchMode
  };

  console.log(`
🤖 Multi-Agent Feature Development System
==========================================
Feature: ${featureSpec.name}
Description: ${featureSpec.description}
Mode: ${isArchMode ? 'Architecture + Implementation' : 'Issue Implementation'}
Issues: ${isArchMode ? 'Will be created by architect agent' : issueNumbers.join(', ')}
Base Branch: ${featureSpec.baseBranch}
Parent Feature: ${isParentFeature ? 'Yes' : 'No'}
Worktree: ${config.baseWorktreePath}/stays-${featureName}
Max Concurrent Tasks: ${config.maxConcurrentTasks}
Required Approvals: ${config.requiredApprovals}
`);

  try {
    const orchestrator = new MultiAgentFeatureOrchestrator(config, featureName);
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