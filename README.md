# CODETTEA: Multi-Agent Feature Development System

🤖 A project-agnostic automated feature development system using multiple Claude Code agents with solve/review workflow.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/multi-agent-dev.git
cd multi-agent-dev
npm install

# Ensure Claude Code CLI is installed and available
echo "Hello, please respond with test works" | claude code --dangerously-skip-permissions

# Launch interactive CLI (two options):

# Option 1: Run from the tool directory (scans parent directory)
cd /path/to/git/multi-agent-dev
npm run interactive  # Will scan /path/to/git for projects

# Option 2: Run from your git root (scans subdirectories)
cd /path/to/git
/path/to/git/multi-agent-dev/interactive  # Will scan current directory for projects
```

> **Note**: This system uses your existing Claude Code subscription, not the Anthropic API. No additional API credits needed!

## Project-Agnostic Design

This system works with **any git repository**:

- 🎯 **Auto-discovery** - Scans for git repositories in current directory
- 📁 **Project Selection** - Choose which project to work on
- 📝 **CLAUDE.md Support** - Works best with projects containing CLAUDE.md files
- 🌳 **Smart Worktrees** - Creates project-specific worktrees (`{project}-{feature}`)

## Interactive CLI ✨

The easiest way to use the system is through the interactive CLI:

```bash
npm run ui  # or npm run interactive
```

**Features:**

- 📂 **Project Selection** - Browse and select from available git projects
- 🎯 **Guided Workflows** - Step-by-step feature development
- 📊 **Real-time Status** - View active features, issues, and progress
- 🌳 **Worktree Management** - Visual worktree creation and cleanup
- 🔄 **Project Switching** - Easily switch between different projects
- ⚙️ **Configuration** - Easy setup and testing
- 🔍 **Issue Explorer** - Browse and select existing issues
- 📋 **Progress Tracking** - See what's in progress vs completed

### Interactive Menu Options

```
🤖 Multi-Agent Feature Development System
==========================================

📂 Available Projects:
  1. my-webapp (/Users/you/git/my-webapp) - ✅ CLAUDE.md
  2. api-service (/Users/you/git/api-service) - ⚠️  No CLAUDE.md
  3. shared-lib (/Users/you/git/shared-lib) - ✅ CLAUDE.md

🤖 Select a project (1-3): 1

✅ Selected project: my-webapp

📋 What would you like to do? (Project: my-webapp)

  1. 🏗️  Start New Feature (Full Architecture + Implementation)
  2. 🔧  Work on Existing Features
  3. 📊  View Current Status
  4. 🌳  Manage Worktrees
  5. 🔄  Switch Project
  6. ⚙️  Configuration
  7. ❌  Exit
```

## Command Line Usage

For advanced users or automation, use the direct CLI:

### Full Feature Development (Architecture + Implementation)

```bash
# Run from any project directory
./run-feature.ts user-auth "Implement user authentication with JWT tokens" --arch

# Or specify a project path
./run-feature.ts user-auth "Implement user authentication" --arch --project /path/to/project
```

**This will:**

1. 🏗️ **Architecture Phase**: Analyze requirements, create feature branch, setup worktree, create GitHub project and issues
2. 🔧 **Implementation Phase**: Execute each issue with solve → review → approve cycle
3. 🚀 **Integration**: Merge completed work and create feature PR

### Working on Existing Feature Branch

```bash
# Solve specific issues on existing feature branch
./run-feature.ts user-management 123 124 125

# With specific project
./run-feature.ts user-management 123 124 125 --project /path/to/project
```

### Creating New Feature Branch with Existing Issues

```bash
# Create new feature branch and solve existing issues
./run-feature.ts payment-system 130 131 132 --parent-feature
```

## How It Works

### 1. Project Detection

- Scans current directory for git repositories
- Identifies projects with CLAUDE.md files
- Allows selection of target project
- Configures paths dynamically

### 2. Claude Code Integration

- Uses your existing Claude Code CLI (no API credits needed!)
- Agents run through `claude` command with custom prompts
- Leverages your Claude Code subscription
- Full codebase context awareness

### 3. Worktree Management

- Creates isolated development environments at `../{project}-{feature}`
- Handles git sync with your existing patterns
- Enables parallel feature development

### 4. Multi-Agent Architecture

- **Architecture Agent**: Uses `arch.md` to analyze requirements and create technical design
- **Solver Agents**: Use `solve.md` to implement individual GitHub issues
- **Reviewer Agents**: Use `review.md` with specialized profiles (frontend/backend/devops)
- **Orchestrator**: Coordinates all agents and manages workflow

### 5. Task Execution Flow

- Loads GitHub issues as atomic tasks
- Parses dependencies from issue descriptions
- Executes tasks in dependency-aware order
- Creates step branches: `feature/{feature-name}-step-N`

### 6. Review & Approval Process

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

## Best Practices

### CLAUDE.md Files

For best results, ensure your projects have a `CLAUDE.md` file in the root:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

[Brief description of your project]

## Architecture

[Key architectural decisions and patterns]

## Common Commands

- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`

## Development Guidelines

[Project-specific guidelines and conventions]
```

### Project Structure

The system works best with projects that follow standard conventions:

- Git repository with clear branching strategy
- GitHub issues for task tracking
- Standard build/test/lint commands
- Clear module organization

## Configuration

### System Requirements

- **Claude Code CLI**: Must be installed and in your PATH
- **Claude Code Subscription**: Uses your existing plan (no API credits needed)
- **GitHub CLI**: For issue and PR management (`gh` command)
- **Git Worktrees**: For parallel development environments

### Dynamic Configuration

The system automatically configures based on selected project:

- `mainRepoPath`: Selected project path
- `baseWorktreePath`: Parent directory of project
- `worktreePattern`: `{project}-{feature}`

### Manual Configuration

For command-line usage with specific projects:

```bash
# Use --project flag
./run-feature.ts feature-name "description" --arch --project /path/to/project
```

### Verification

```bash
# Check Claude Code is available
echo "Hello, please respond with test works" | claude code --dangerously-skip-permissions

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
# 1. Launch interactive CLI from your git root
cd ~/git  # Directory containing your projects
npm run interactive

# 2. Select your project
Select: my-webapp

# 3. Start new feature
Select: Start New Feature

# 4. System will:
# - Create feature/user-auth branch
# - Create ../my-webapp-user-auth worktree
# - Run architecture agent
# - Create GitHub issues
# - Implement each issue
# - Review with 3 agents
# - Create final feature PR
```

## Monitoring

Watch logs for real-time progress:

```bash
tail -f logs/feature-{name}-{timestamp}.log
```

## Integration with Existing Workflow

This system enhances your existing process:

- ✅ Works with any git repository
- ✅ Respects project-specific CLAUDE.md files
- ✅ Uses your existing prompts and patterns
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

### Project Detection Issues

- **No Projects Found**: Ensure you're running from a directory containing git repositories
- **CLAUDE.md Missing**: Add a CLAUDE.md file to your project root for better guidance
- **Permission Denied**: Check read permissions on project directories

### Agent Execution Issues

- **Timeout Errors**: Increase timeout in orchestrator (default: 5 minutes)
- **Prompt File Issues**: Check worktree permissions and disk space
- **Context Errors**: Ensure worktree has latest `.codettea` configuration

### Worktree Management

- **Stuck Worktrees**: `git worktree remove ../{project}-{feature} --force`
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

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - See LICENSE file for details
