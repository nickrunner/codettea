#!/usr/bin/env tsx
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveMultiAgentCLI = void 0;
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const util_1 = require("util");
const orchestrator_1 = require("./orchestrator");
const BranchUtils = __importStar(require("./utils/branches"));
const WorktreeUtils = __importStar(require("./utils/worktreeManager"));
// Import new utilities
const utils_1 = require("./utils");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class InteractiveMultiAgentCLI {
    rl;
    config;
    selectedProject;
    constructor() {
        this.rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        // Initialize with default config - will be updated when project is selected
        this.config = (0, utils_1.getDefaultConfig)();
    }
    async start() {
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
            }
            catch (error) {
                console.error('\n❌ Error:', error);
                await this.waitForUser('\n📋 Press Enter to continue...');
            }
        }
        this.rl.close();
    }
    async showWelcome() {
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
│ 🔍 Scanning: ${path_1.default.dirname(process.cwd())} and ${process.cwd()}
│ 🤖 Claude Code: ${(await (0, utils_1.checkClaudeCode)()) ? '✅ Available' : '❌ Not Found'}
└─────────────────────────────────────────────

🎵 Quick Start:
• Run from /git/codettea to scan projects
• Each feature performs in its own worktree
• Works best with CLAUDE.md configured projects

Ready to start the symphony? Maestro awaits! 🎭
`);
    }
    async selectProject() {
        console.log('\n🔍 Scanning for git repositories...\n');
        const gitProjects = await (0, utils_1.findGitProjects)();
        if (gitProjects.length === 0) {
            console.log('❌ No git repositories found in the current directory.');
            console.log('💡 Please run this tool from a directory containing git repositories.');
            process.exit(1);
        }
        console.log('📂 Available Projects:\n');
        gitProjects.forEach((project, index) => {
            const hasClaudeMd = project.hasClaudeMd
                ? '✅ CLAUDE.md'
                : '⚠️  No CLAUDE.md';
            console.log(`  ${index + 1}. ${project.name} (${project.path}) - ${hasClaudeMd}`);
        });
        const choice = await this.prompt(`\n🤖 Select a project (1-${gitProjects.length}): `);
        const selected = (0, utils_1.selectProject)(gitProjects, choice);
        if (selected) {
            this.selectedProject = selected.name;
            this.config.mainRepoPath = selected.path;
            this.config.baseWorktreePath = path_1.default.dirname(selected.path);
            // Load project-specific configuration
            const projectConfig = await (0, utils_1.loadProjectConfig)(this.config.mainRepoPath);
            this.config = (0, utils_1.mergeProjectConfig)(this.config, projectConfig);
            console.log(`\n✅ Selected project: ${selected.name}`);
            if (!selected.hasClaudeMd) {
                console.log('⚠️  Warning: This project does not have a CLAUDE.md file.');
                console.log('   Consider adding one for better agent guidance.');
            }
        }
        else {
            console.log('❌ Invalid choice.');
            await this.selectProject();
        }
    }
    async showMainMenu() {
        const options = [
            '🏗️  Start New Feature (Full Architecture + Implementation)',
            '🔧  Work on Existing Features',
            '📊  View Current Status',
            '🌳  Manage Worktrees',
            '🔄  Switch Project',
            '⚙️  Configuration',
            '❌  Exit',
        ];
        console.log(`\n📋 What would you like to do? (Project: ${this.selectedProject})\n`);
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
    async handleAction(action) {
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
    async handleNewFeature() {
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
        const featureName = await this.prompt('📝 Feature name (kebab-case, e.g., "user-auth"): ');
        if (!(0, utils_1.isValidFeatureName)(featureName)) {
            console.log('❌ Invalid feature name. Use kebab-case (letters, numbers, hyphens only)');
            return;
        }
        console.log('\n📖 Feature description examples:');
        console.log('  • "Implement user authentication with JWT tokens and password reset"');
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
🌳 Worktree: ${this.config.baseWorktreePath}/${(0, utils_1.getProjectName)(this.config.mainRepoPath)}-${featureName}
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
    async handleExistingIssues() {
        console.clear();
        console.log(`
🔧  Work on Existing Features
===========================
`);
        // Show existing features (already filtered to only show features with worktrees)
        const features = await (0, utils_1.getExistingFeatures)(this.config, this.selectedProject);
        if (features.length === 0) {
            console.log('📭 No active feature branches with worktrees found. Use "Start New Feature" to create one.');
            return;
        }
        console.log('🌿 Active Features (with worktrees):');
        console.log(`📁 Project: ${this.selectedProject || path_1.default.basename(this.config.mainRepoPath)} (${this.config.mainRepoPath})\n`);
        features.forEach((feature, index) => {
            const openIssues = feature.issues.filter(i => i.state === 'open').length;
            console.log(`  ${index + 1}. ${feature.name}`);
            console.log(`     📁 ${feature.worktreePath}`);
            const totalIssues = feature.issues.length;
            const issueText = totalIssues > 0
                ? `📋 ${openIssues} open issues, ${totalIssues - openIssues} completed`
                : `📋 No issues found (checked labels + title search)`;
            console.log(`     ${issueText}\n`);
        });
        const choice = await this.prompt('🔍 Select feature (number) or type issue numbers (comma-separated): ');
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
        await this.executeFeatureDevelopment(featureName, `Issues: ${issueNumbers.join(', ')}`, false, issueNumbers);
    }
    async showFeatureDetails(feature) {
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
        const sortedIssues = (0, utils_1.sortIssuesByStep)(feature.issues);
        // Quick Reference Section
        console.log('📋 Quick Reference - Issue Numbers by Step:\n');
        if (sortedIssues.length > 0) {
            const openIssues = sortedIssues.filter(i => i.state === 'open');
            const closedIssues = sortedIssues.filter(i => i.state === 'closed');
            if (openIssues.length > 0) {
                console.log('🔴 Open: ' + openIssues.map(i => `#${i.number}`).join(', '));
            }
            if (closedIssues.length > 0) {
                console.log('✅ Completed: ' + closedIssues.map(i => `#${i.number}`).join(', '));
            }
        }
        console.log(`\n📋 All Issues by Step Order (${feature.issues.length} total):\n`);
        if (sortedIssues.length > 0) {
            sortedIssues.forEach(issue => {
                const stepNum = (0, utils_1.extractStepNumber)(issue.title);
                const stepText = stepNum !== 999
                    ? `Step ${stepNum.toString().padStart(2, '0')}`
                    : 'No Step';
                const stateIcon = issue.state === 'open' ? '🔴' : '✅';
                const progress = issue.inProgress ? ' 🚧' : '';
                const labels = issue.labels.length > 0 ? ` [${issue.labels.join(', ')}]` : '';
                console.log(`   ${stateIcon} #${issue.number
                    .toString()
                    .padStart(2, ' ')} | ${stepText} | ${issue.title}${labels}${progress}`);
            });
        }
        else {
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
                    const issues = openIssuesForWork.map((i) => i.number);
                    await this.executeFeatureDevelopment(feature.name, `All open issues for ${feature.name}`, false, issues);
                }
                else {
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
    async workOnNextIssue(feature, sortedIssues) {
        const openIssues = (0, utils_1.filterIssuesByState)(sortedIssues, 'open');
        if (openIssues.length === 0) {
            console.log('✅ No open issues found!');
            return;
        }
        const nextIssueInfo = await (0, utils_1.workOnNextIssue)(feature, sortedIssues);
        if (!nextIssueInfo) {
            console.log('✅ No open issues found!');
            return;
        }
        const nextIssue = openIssues[0];
        const { stepText } = nextIssueInfo;
        console.log(`\n🚀 Next Issue to Work On:\n`);
        console.log(`   🎯 #${nextIssue.number} | ${stepText} | ${nextIssue.title}`);
        if (nextIssue.labels.length > 0) {
            console.log(`   🏷️  Labels: ${nextIssue.labels.join(', ')}`);
        }
        const confirm = await this.prompt(`\n❓ Start working on issue #${nextIssue.number}? (y/N): `);
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            await this.executeFeatureDevelopment(feature.name, `Next issue: #${nextIssue.number} - ${nextIssue.title}`, false, [nextIssue.number]);
        }
        else {
            console.log('❌ Cancelled');
        }
    }
    async workOnSpecificIssue(feature, sortedIssues) {
        const openIssues = (0, utils_1.filterIssuesByState)(sortedIssues, 'open');
        if (openIssues.length === 0) {
            console.log('✅ No open issues found!');
            return;
        }
        console.log('\n🎯 Select Specific Issue to Work On:\n');
        openIssues.forEach((issue, index) => {
            const stepNum = (0, utils_1.extractStepNumber)(issue.title);
            const stepText = stepNum !== 999
                ? `Step ${stepNum.toString().padStart(2, '0')}`
                : 'No Step';
            console.log(`  ${index + 1}. #${issue.number} | ${stepText} | ${issue.title}`);
        });
        console.log(`\n💡 You can also enter the issue number directly (e.g., "${openIssues[0].number}")`);
        const choice = await this.prompt('\n🤖 Select issue (number from list or issue #): ');
        const selectedIssue = (0, utils_1.selectSpecificIssue)(openIssues, choice);
        if (!selectedIssue) {
            console.log('❌ Invalid selection');
            return;
        }
        const stepNum = (0, utils_1.extractStepNumber)(selectedIssue.title);
        const stepText = stepNum !== 999 ? `Step ${stepNum}` : 'No Step';
        console.log(`\n🎯 Selected Issue:\n`);
        console.log(`   #${selectedIssue.number} | ${stepText} | ${selectedIssue.title}`);
        const confirm = await this.prompt(`\n❓ Start working on this issue? (y/N): `);
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            await this.executeFeatureDevelopment(feature.name, `Single issue: #${selectedIssue.number} - ${selectedIssue.title}`, false, [selectedIssue.number]);
        }
        else {
            console.log('❌ Cancelled');
        }
    }
    async handleAddIssues(featureName) {
        console.log('\n📝 Add Issues to Feature\n');
        const issueNumbers = await this.prompt('📋 Issue numbers (comma-separated): ');
        const issues = (0, utils_1.parseIssueNumbers)(issueNumbers);
        if (issues.length === 0) {
            console.log('❌ No valid issue numbers provided');
            return;
        }
        // Add feature label to issues
        const result = await (0, utils_1.addIssuesToFeature)(featureName, issues, this.config.mainRepoPath);
        result.success.forEach(issueNum => {
            console.log(`✅ Added ${featureName} label to issue #${issueNum}`);
        });
        result.failed.forEach(issueNum => {
            console.log(`⚠️  Could not update issue #${issueNum}`);
        });
        const workNow = await this.prompt('\n🔧 Work on these issues now? (y/N): ');
        if (workNow.toLowerCase() === 'y' || workNow.toLowerCase() === 'yes') {
            await this.executeFeatureDevelopment(featureName, `Added issues: ${issues.join(', ')}`, false, issues);
        }
    }
    async handleStatus() {
        console.clear();
        console.log(`
📊  System Status
=================
`);
        // Check system status
        const status = await (0, utils_1.checkSystemStatus)(this.config.mainRepoPath);
        console.log('🔑 Configuration:');
        console.log(`   Claude Code: ${status.claudeAvailable ? '✅ Available' : '❌ Not Found'}`);
        console.log(`   Main Repo: ${this.config.mainRepoPath}`);
        console.log(`   Worktree Base: ${this.config.baseWorktreePath}`);
        console.log(`   Git Status: ${status.gitStatus === 'clean'
            ? '✅ Clean'
            : status.gitStatus === 'uncommitted'
                ? '⚠️  Uncommitted changes'
                : '❌ Error checking status'}`);
        // Show active features with worktrees
        console.log('\n🌳 Active Features (with worktrees):');
        const features = await (0, utils_1.getExistingFeatures)(this.config, this.selectedProject);
        if (features.length === 0) {
            console.log('   📭 No active features with worktrees');
        }
        else {
            features.forEach(feature => {
                const openIssues = feature.issues.filter(i => i.state === 'open').length;
                console.log(`   ✅ ${feature.name} (${openIssues} open issues)`);
            });
        }
        // Show recent issues
        console.log('\n📋 Recent Issues:');
        const recentIssues = await (0, utils_1.getRecentIssues)(this.config.mainRepoPath, 5);
        if (recentIssues.length > 0) {
            recentIssues.forEach(issue => {
                const stateIcon = issue.state === 'open' ? '🔴' : '✅';
                const labels = issue.labels.join(', ');
                console.log(`   ${stateIcon} #${issue.number}: ${issue.title} ${labels ? `[${labels}]` : ''}`);
            });
        }
        else {
            console.log('   ❌ Could not fetch recent issues');
        }
        // Show worktrees
        console.log('\n🌳 Git Worktrees:');
        const worktrees = await (0, utils_1.getWorktrees)(this.config.mainRepoPath);
        if (worktrees.length > 0) {
            worktrees.forEach((wt) => {
                const icon = wt.isMain ? '🏠' : '🌿';
                console.log(`   ${icon} ${wt.path} (${wt.branch})`);
            });
        }
        else {
            console.log('   ❌ Could not list worktrees');
        }
    }
    async handleWorktrees() {
        console.clear();
        console.log(`
🌳  Worktree Management  
======================
`);
        try {
            const worktrees = await WorktreeUtils.getWorktreeList(this.config.mainRepoPath);
            console.log('📁 Current Worktrees:\n');
            worktrees.forEach((wt, index) => {
                const icon = wt.isMain ? '🏠' : '🌿';
                const status = wt.isMain ? ' (main)' : '';
                console.log(`  ${index + 1}. ${icon} ${wt.path}${status}`);
                console.log(`     Branch: ${wt.branch || 'detached'}\n`);
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
        }
        catch (error) {
            console.log('❌ Could not list worktrees:', error);
        }
    }
    async createWorktree() {
        const featureName = await this.prompt('\n📝 Feature name for new worktree: ');
        try {
            await WorktreeUtils.createWorktree(featureName, this.config.mainRepoPath, this.config.baseWorktreePath, (0, utils_1.getProjectName)(this.config.mainRepoPath));
        }
        catch (error) {
            console.log('❌ Failed to create worktree:', error);
        }
    }
    async removeWorktree(worktrees) {
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
                    await WorktreeUtils.removeWorktree(worktree.path, this.config.mainRepoPath, false);
                    console.log(`✅ Removed worktree: ${worktree.path}`);
                }
                catch (error) {
                    // If removal failed due to uncommitted changes, ask for confirmation before forcing
                    console.log(`⚠️  Worktree contains uncommitted changes!`);
                    const forceConfirm = await this.prompt(`🚨 Force remove and lose changes? (y/N): `);
                    if (forceConfirm.toLowerCase() === 'y') {
                        try {
                            await WorktreeUtils.removeWorktree(worktree.path, this.config.mainRepoPath, true);
                            console.log(`✅ Force-removed worktree: ${worktree.path}`);
                        }
                        catch (forceError) {
                            console.log('❌ Failed to remove worktree even with --force:', forceError);
                        }
                    }
                    else {
                        console.log('❌ Worktree removal cancelled. Commit or stash changes first.');
                    }
                }
            }
        }
    }
    async cleanupWorktrees() {
        try {
            const result = await WorktreeUtils.cleanupWorktrees(this.config.mainRepoPath);
            if (result.pruned) {
                console.log('✅ Cleaned up unused worktrees');
                if (result.removed.length > 0) {
                    result.removed.forEach(item => console.log(item));
                }
            }
        }
        catch (error) {
            console.log('❌ Failed to cleanup worktrees:', error);
        }
    }
    async handleBranchCleanup() {
        console.clear();
        console.log(`
🧹  Branch Cleanup Utility
==========================
`);
        console.log('🔍 Analyzing branches...\n');
        try {
            // Get merged branches using our utilities
            const preview = await BranchUtils.previewCleanup(this.config.mainRepoPath);
            const mergedBranches = preview.mergedBranches;
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
        }
        catch (error) {
            console.log('❌ Failed to analyze branches:', error);
        }
    }
    async deleteMergedBranches(mergedBranches) {
        if (mergedBranches.length === 0) {
            console.log('✅ No merged branches found to delete!');
            return;
        }
        console.log(`\n🔍 Found ${mergedBranches.length} branches merged to main/dev:\n`);
        mergedBranches.forEach(branch => console.log(`   • ${branch}`));
        const confirm = await this.prompt('\n❓ Delete these merged branches? (y/N): ');
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            const result = await BranchUtils.deleteBranches(mergedBranches, this.config.mainRepoPath, { skipConfirmation: true });
            console.log(`\n🎉 Successfully deleted ${result.deleted.length}/${result.total} branches`);
        }
        else {
            console.log('❌ Cleanup cancelled');
        }
    }
    async deleteSpecificBranches() {
        try {
            const allBranches = await BranchUtils.getAllBranches(this.config.mainRepoPath);
            const branches = allBranches
                .map(b => b.name)
                .filter(b => !['main', 'dev', 'master'].includes(b));
            if (branches.length === 0) {
                console.log('📭 No branches available for deletion');
                return;
            }
            console.log('\n📋 Available branches:\n');
            branches.forEach((branch, index) => {
                console.log(`  ${index + 1}. ${branch}`);
            });
            const selection = await this.prompt('\n🔍 Enter branch numbers to delete (comma-separated) or branch names: ');
            let branchesToDelete = [];
            // Check if input is numbers or names
            if (/^\d+(,\d+)*$/.test(selection.trim())) {
                const indices = selection.split(',').map(n => parseInt(n.trim()) - 1);
                branchesToDelete = indices
                    .filter(i => i >= 0 && i < branches.length)
                    .map(i => branches[i]);
            }
            else {
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
                        // Try soft delete first
                        const result = await BranchUtils.deleteBranches([branch], this.config.mainRepoPath, { skipConfirmation: true });
                        if (result.skipped.includes(branch)) {
                            const forceConfirm = await this.prompt(`⚠️  ${branch} is not merged. Force delete? (y/N): `);
                            if (forceConfirm.toLowerCase() === 'y') {
                                await BranchUtils.deleteBranches([branch], this.config.mainRepoPath, { force: true, skipConfirmation: true });
                            }
                        }
                    }
                    catch (error) {
                        console.log(`❌ Failed to delete ${branch}: ${error}`);
                    }
                }
            }
        }
        catch (error) {
            console.log('❌ Failed to get branch list:', error);
        }
    }
    async cleanupRemoteReferences() {
        console.log('\n📡 Cleaning up remote tracking references...\n');
        try {
            const removed = await BranchUtils.cleanupRemoteReferences(this.config.mainRepoPath);
            console.log('✅ Remote reference cleanup completed');
            if (removed.length > 0) {
                console.log('Removed references:');
                removed.forEach(ref => console.log(`   • ${ref}`));
            }
            else {
                console.log('No stale references found');
            }
        }
        catch (error) {
            console.log('❌ Failed to clean remote references:', error);
        }
    }
    async fullBranchCleanup(_mergedBranches) {
        console.log('\n🔄 Full Branch Cleanup\n');
        console.log('This will:');
        console.log('1. Delete all merged branches');
        console.log('2. Clean up remote tracking references');
        const confirm = await this.prompt('\n❓ Proceed with full cleanup? (y/N): ');
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            const result = await BranchUtils.fullBranchCleanup(this.config.mainRepoPath, { skipConfirmation: true });
            console.log(`\n🎉 Full cleanup completed! Deleted ${result.branches.deleted.length} branches and ${result.remoteRefs.length} remote references.`);
        }
        else {
            console.log('❌ Full cleanup cancelled');
        }
    }
    async previewCleanup(_mergedBranches) {
        console.log('\n📋 Cleanup Preview\n');
        const preview = await BranchUtils.previewCleanup(this.config.mainRepoPath);
        console.log('🧹 Branches that would be deleted (merged to main/dev):');
        if (preview.mergedBranches.length > 0) {
            preview.mergedBranches.forEach(branch => console.log(`   • ${branch}`));
        }
        else {
            console.log('   (none)');
        }
        console.log('\n📡 Remote references cleanup:');
        if (preview.remoteReferences.length > 0) {
            console.log('   Would remove:');
            preview.remoteReferences.forEach(ref => console.log(`   • ${ref}`));
        }
        else {
            console.log('   (no stale references)');
        }
        console.log('\n💡 Use options 1-4 to actually perform cleanup operations.');
    }
    async showAllBranchesStatus() {
        console.clear();
        console.log(`
📊  All Branches Status
======================
`);
        try {
            const status = await BranchUtils.showAllBranchesStatus(this.config.mainRepoPath);
            console.log('🌿 Local Branches:\n');
            status.local.forEach(branch => {
                const current = branch.isCurrent ? '* ' : '  ';
                const tracking = branch.upstream ? ` [${branch.upstream}]` : '';
                console.log(`${current}${branch.name} ${branch.lastCommit}${tracking}`);
            });
            console.log('\n🌐 Remote Branches:\n');
            status.remote.forEach(branch => console.log(`  ${branch}`));
            console.log('\n🔄 Merged Status:\n');
            try {
                const { stdout: mergedToMain } = await execAsync('git branch --merged main', {
                    cwd: this.config.mainRepoPath,
                });
                console.log('Merged to main:');
                console.log(mergedToMain);
            }
            catch {
                console.log('Could not check main branch merges');
            }
            try {
                const { stdout: mergedToDev } = await execAsync('git branch --merged dev', {
                    cwd: this.config.mainRepoPath,
                });
                console.log('\nMerged to dev:');
                console.log(mergedToDev);
            }
            catch {
                console.log('Could not check dev branch merges');
            }
        }
        catch (error) {
            console.log('❌ Failed to get branch status:', error);
        }
    }
    async handleConfig() {
        console.clear();
        console.log(`
⚙️  Configuration
=================

Current Settings:
🔧 Claude Code: ${(await (0, utils_1.checkClaudeCode)()) ? '✅ Available' : '❌ Not Found'}
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
    async checkClaudeCodeSetup() {
        console.log('\n🔧 Claude Code Setup Check\n');
        const isAvailable = await (0, utils_1.checkClaudeCode)();
        if (isAvailable) {
            console.log('✅ Claude Code is installed and available');
            // Test Claude Code connection
            if (await (0, utils_1.testClaudeConnection)(this.config.mainRepoPath)) {
                console.log(`📍 Claude Code: Connection test successful`);
            }
            else {
                console.log(`⚠️ Claude Code: Connection test failed`);
            }
            const location = await (0, utils_1.getClaudeLocation)();
            if (location) {
                console.log(`📁 Location: ${location}`);
            }
        }
        else {
            console.log('❌ Claude Code not found in PATH');
            console.log('\n📥 Installation Instructions:');
            console.log('1. Visit https://claude.ai/code');
            console.log('2. Download and install Claude Code CLI');
            console.log("3. Ensure it's in your PATH");
            console.log('4. Test with: echo "Hello, please respond with test works" | claude code --dangerously-skip-permissions');
            console.log('\n💡 You need Claude Code (not API credits) to use this system');
        }
    }
    async updatePaths() {
        console.log(`\nCurrent paths:
📁 Main Repo: ${this.config.mainRepoPath}
🌳 Worktree Base: ${this.config.baseWorktreePath}
`);
        const updateMain = await this.prompt('📝 New main repo path (or press Enter to keep current): ');
        if (updateMain.trim()) {
            this.config.mainRepoPath = updateMain.trim();
        }
        const updateWorktree = await this.prompt('📝 New worktree base path (or press Enter to keep current): ');
        if (updateWorktree.trim()) {
            this.config.baseWorktreePath = updateWorktree.trim();
        }
        console.log('✅ Paths updated');
    }
    async setBaseBranch() {
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
            const { stdout } = await execAsync('git branch -r', {
                cwd: this.config.mainRepoPath,
            });
            const remoteBranches = stdout
                .split('\n')
                .map(line => line.trim().replace('origin/', ''))
                .filter(branch => branch && !branch.includes('->'))
                .slice(0, 10); // Limit to first 10 branches
            console.log('🌐 Available remote branches:');
            remoteBranches.forEach(branch => {
                const isCommon = ['main', 'master', 'dev', 'develop'].includes(branch);
                const marker = isCommon ? '⭐' : '  ';
                console.log(`${marker} ${branch}`);
            });
        }
        catch (error) {
            console.log('⚠️  Could not fetch remote branches');
        }
        const input = await this.prompt('\n📝 Enter base branch name (or press Enter for auto-detect): ');
        const trimmed = input.trim();
        if (trimmed) {
            this.config.baseBranch = trimmed;
            console.log(`✅ Base branch set to: ${trimmed}`);
        }
        else {
            this.config.baseBranch = undefined;
            console.log('✅ Base branch set to auto-detect');
        }
        // Save the configuration
        const projectConfig = {
            baseBranch: this.config.baseBranch,
            maxConcurrentTasks: this.config.maxConcurrentTasks,
            requiredApprovals: this.config.requiredApprovals,
            reviewerProfiles: this.config.reviewerProfiles,
        };
        await (0, utils_1.saveProjectConfig)(this.config.mainRepoPath, projectConfig);
    }
    async adjustLimits() {
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
        if (!isNaN(parsedApprovals) &&
            parsedApprovals >= 1 &&
            parsedApprovals <= 5) {
            this.config.requiredApprovals = parsedApprovals;
        }
        console.log('✅ Limits updated');
        // Save the configuration
        const projectConfig = {
            baseBranch: this.config.baseBranch,
            maxConcurrentTasks: this.config.maxConcurrentTasks,
            requiredApprovals: this.config.requiredApprovals,
            reviewerProfiles: this.config.reviewerProfiles,
        };
        await (0, utils_1.saveProjectConfig)(this.config.mainRepoPath, projectConfig);
    }
    async testConfiguration() {
        console.log('\n🧪 Testing Configuration...\n');
        // Test Claude Code
        if (await (0, utils_1.checkClaudeCode)()) {
            console.log('✅ Claude Code: Available');
        }
        else {
            console.log('❌ Claude Code: Not found in PATH');
        }
        // Test main repo
        try {
            await promises_1.default.access(this.config.mainRepoPath);
            const gitStatus = await (0, utils_1.checkGitStatus)(this.config.mainRepoPath);
            if (gitStatus !== 'error') {
                console.log('✅ Main Repo: Accessible and is git repository');
            }
            else {
                console.log('❌ Main Repo: Not accessible or not a git repository');
            }
        }
        catch {
            console.log('❌ Main Repo: Not accessible or not a git repository');
        }
        // Test worktree base
        try {
            await promises_1.default.access(this.config.baseWorktreePath);
            console.log('✅ Worktree Base: Accessible');
        }
        catch {
            console.log('❌ Worktree Base: Not accessible');
        }
        // Test GitHub CLI
        if (await (0, utils_1.checkGitHubAuth)(this.config.mainRepoPath)) {
            console.log('✅ GitHub CLI: Authenticated');
        }
        else {
            console.log('❌ GitHub CLI: Not authenticated');
        }
        console.log('\n📊 Configuration test complete');
    }
    async executeFeatureDevelopment(featureName, description, isArchMode, issues) {
        console.log(`\n🚀 Starting ${isArchMode ? 'full feature development' : 'issue implementation'}...\n`);
        // Use configured base branch or auto-detect
        const baseBranch = this.config.baseBranch ||
            (await (0, utils_1.getDefaultBranch)(this.config.mainRepoPath));
        const spec = {
            name: featureName,
            description,
            baseBranch,
            issues: isArchMode ? undefined : issues,
            isParentFeature: true,
            architectureMode: isArchMode,
        };
        try {
            const orchestrator = new orchestrator_1.MultiAgentFeatureOrchestrator(this.config, featureName, this.selectedProject);
            await orchestrator.executeFeature(spec);
            console.log('\n🎉 Feature development completed successfully!');
        }
        catch (error) {
            console.error('\n💥 Feature development failed:', error);
        }
    }
    async showWorktreeStatus(worktreePath) {
        console.log(`\n📁 Worktree Status: ${worktreePath}\n`);
        const status = await WorktreeUtils.showWorktreeStatus(worktreePath);
        if (status) {
            console.log(`🌿 Current Branch: ${status.branch}`);
            if (status.hasChanges && status.changedFiles) {
                console.log('📝 Working Directory Changes:');
                status.changedFiles.forEach(file => console.log(file));
            }
            else {
                console.log('✅ Working directory clean');
            }
            if (status.recentCommits && status.recentCommits.length > 0) {
                console.log('\n📚 Recent Commits:');
                status.recentCommits.forEach(commit => console.log(commit));
            }
        }
        else {
            console.log('❌ Could not access worktree');
        }
    }
    async prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question, resolve);
        });
    }
    async waitForUser(message) {
        await this.prompt(message);
    }
}
exports.InteractiveMultiAgentCLI = InteractiveMultiAgentCLI;
async function main() {
    const cli = new InteractiveMultiAgentCLI();
    await cli.start();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=interactive.js.map