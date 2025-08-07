# Multi-Agent Feature Development System

🤖 Automated feature development using multiple Claude Code agents with your existing solve/review workflow.

## Quick Start

```bash
cd /Users/nickschrock/git/multi-agent-dev
npm install

# Ensure Claude Code CLI is installed and available
claude --version

# Launch interactive CLI (recommended)
npm run interactive
```

> **Note**: This system uses your existing Claude Code subscription, not the Anthropic API. No additional API credits needed!

## Interactive CLI ✨

The easiest way to use the system is through the interactive CLI:

```bash
npm run ui  # or npm run interactive
```

**Features:**
- 🎯 **Guided Workflows** - Step-by-step feature development
- 📊 **Real-time Status** - View active features, issues, and progress  
- 🌳 **Worktree Management** - Visual worktree creation and cleanup
- ⚙️ **Configuration** - Easy setup and testing
- 🔍 **Issue Explorer** - Browse and select existing issues
- 📋 **Progress Tracking** - See what's in progress vs completed

### Interactive Menu Options

```
🤖 Multi-Agent Feature Development System
==========================================

📋 What would you like to do?

  1. 🏗️  Start New Feature (Full Architecture + Implementation)
  2. 🔧  Work on Existing Issues
  3. 📊  View Current Status  
  4. 🌳  Manage Worktrees
  5. ⚙️  Configuration
  6. ❌  Exit
```

## Command Line Usage

For advanced users or automation, use the direct CLI:

### Full Feature Development (Architecture + Implementation)

```bash
./run-feature.ts user-auth "Implement user authentication with JWT tokens and password reset" --arch
```

**This will:**
1. 🏗️ **Architecture Phase**: Analyze requirements, create feature branch, setup worktree, create GitHub project and issues
2. 🔧 **Implementation Phase**: Execute each issue with solve → review → approve cycle
3. 🚀 **Integration**: Merge completed work and create feature PR

### Working on Existing Feature Branch

```bash
# Solve specific issues on existing feature/user-management branch  
./run-feature.ts user-management 123 124 125
```

### Creating New Feature Branch with Existing Issues

```bash
# Create new feature/payment-system branch and solve existing issues
./run-feature.ts payment-system 130 131 132 --parent-feature
```

### Single Issue

```bash
# Work on single issue in existing feature
./run-feature.ts dashboard-updates 140
```

## How It Works

### 1. Claude Code Integration
- Uses your existing Claude Code CLI (no API credits needed!)
- Agents run through `claude` command with custom prompts
- Leverages your Claude Code Max subscription
- Full codebase context awareness

### 2. Worktree Management
- Creates isolated development environments at `../stays-{feature-name}`
- Handles git sync with your existing patterns
- Copies `.claude` config to each worktree
- Enables parallel feature development

### 3. Multi-Agent Architecture
- **Architecture Agent**: Uses `arch.md` to analyze requirements and create technical design
- **Solver Agents**: Use `solve.md` to implement individual GitHub issues
- **Reviewer Agents**: Use `review.md` with specialized profiles (frontend/backend/devops)
- **Orchestrator**: Coordinates all agents and manages workflow

### 4. Task Execution Flow
- Loads GitHub issues as atomic tasks
- Parses dependencies from issue descriptions  
- Executes tasks in dependency-aware order
- Creates step branches: `feature/{feature-name}-step-N`

### 5. Review & Approval Process
```
Architecture → Issue Creation → Implementation → Review → Integration
     ↓              ↓               ↓           ↓         ↓
🏗️ arch.md    📋 GitHub      🔧 solve.md   🔍 review.md  🚀 Final PR
```

**Review Logic:**
```
solve → review x3 → if 3xAPPROVE → merge → next task
         |
         → if REJECT → feedback & retry (max 3 attempts)
```

### 6. GitHub Integration
- Creates PRs using your existing workflow patterns
- Updates issue task lists and acceptance criteria
- Closes issues when completed  
- Maintains complete audit trail
- Creates final feature PR with comprehensive summary

## Configuration

### System Requirements
- **Claude Code CLI**: Must be installed and in your PATH
- **Claude Code Subscription**: Uses your existing plan (no API credits needed)
- **GitHub CLI**: For issue and PR management (`gh` command)
- **Git Worktrees**: For parallel development environments

### Settings
Edit `run-feature.ts` to customize:

```typescript
const config = {
  mainRepoPath: '/path/to/your/repo',           // Your main repository
  baseWorktreePath: '/path/to/worktrees',       // Where worktrees are created  
  maxConcurrentTasks: 2,                        // Parallel task limit
  requiredApprovals: 3,                         // Reviews required per task
  reviewerProfiles: ['frontend', 'backend', 'devops']  // Reviewer specializations
};
```

### Verification
```bash
# Check Claude Code is available
claude --version

# Check GitHub CLI is authenticated  
gh auth status

# Test the system configuration
npm run ui → Configuration → Test configuration
```

## Dependency Management

In GitHub issues, specify dependencies:

```markdown
## Task Description
Implement user authentication

## Dependencies
Depends on #123
Blocked by #124

## Acceptance Criteria
- [ ] Login form
- [ ] JWT validation
```

The system will automatically respect dependency order.

## Example Workflow

```bash
# 1. Create feature with dependent issues
./run-feature.ts user-auth 120 121 122 123 --parent-feature

# The system will:
# - Create feature/user-auth branch
# - Create ../stays-user-auth worktree  
# - Solve issue 120 (if no dependencies)
# - Review with 3 agents
# - If approved: merge and continue to 121
# - If rejected: retry with feedback (up to 3x)
# - Continue until all issues complete
# - Create final feature PR
```

## Monitoring

Watch logs for real-time progress:

```bash
tail -f logs/feature-{name}-{timestamp}.log
```

## Integration with Existing Workflow

This system enhances your existing process:

- ✅ Uses your `solve.md` and `rev.md` prompts
- ✅ Works with your worktree pattern
- ✅ Follows your git branching strategy  
- ✅ Integrates with GitHub CLI (`gh`)
- ✅ Respects your build/test/lint requirements
- ✅ Maintains your documentation patterns

## Troubleshooting

### Setup Issues
- **Claude Code Not Found**: Install from https://claude.ai/code and ensure it's in PATH
- **GitHub CLI**: Authenticate with `gh auth login`  
- **Permissions**: Make scripts executable with `chmod +x *.ts`
- **Dependencies**: Run `npm install` to install TypeScript dependencies

### Agent Execution Issues  
- **Timeout Errors**: Increase timeout in orchestrator (default: 5 minutes)
- **Prompt File Issues**: Check worktree permissions and disk space
- **Context Errors**: Ensure worktree has latest `.claude` configuration

### Worktree Management
- **Stuck Worktrees**: `git worktree remove ../stays-{name} --force`
- **Disk Space**: Monitor worktree directory size
- **Branch Conflicts**: Ensure feature branches are up-to-date with dev

### Review Process Issues
- **Too Strict**: Reduce `requiredApprovals` from 3 to 2
- **Profile Mismatch**: Adjust reviewer profiles for your domain
- **Retry Loops**: Check logs for specific failure patterns

### Performance Optimization
- **Concurrent Tasks**: Start with 1, increase based on system capacity
- **Resource Usage**: Monitor CPU/memory during multi-agent execution
- **Claude Code Limits**: Be aware of subscription usage patterns