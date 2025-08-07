# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a multi-agent feature development system that orchestrates Claude Code agents to automate feature development workflows. The system creates isolated git worktrees, manages GitHub issues, and coordinates multiple specialized agents for architecture planning, implementation, and code review.

### Core Architecture

**Multi-Agent Orchestration**: The system runs multiple specialized Claude Code agents:
- **Architecture Agent** (`arch.md`): Analyzes requirements, creates technical designs, and generates GitHub issues
- **Solver Agents** (`solve.md`): Implement individual GitHub issues with full development workflow
- **Reviewer Agents** (`review.md`): Perform specialized code reviews (frontend/backend/devops perspectives)

**Git Worktree Management**: Creates isolated development environments at `../stays-{feature-name}` for parallel feature development without conflicts.

**GitHub Integration**: Manages issues, projects, and pull requests through GitHub CLI (`gh`) with full audit trails.

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Interactive CLI (recommended workflow)
npm run interactive
# or
npm run ui

# Direct CLI execution
npm run dev

# Run specific feature development
./run-feature.ts <feature-name> "<description>" --arch
./run-feature.ts <feature-name> <issue-numbers...>
```

### Testing & Quality
```bash
# Run full test suite
npm run test

# Individual test types
npm run test:unit
npm run test:integration
npm run test:jest
npm run test:coverage

# Watch mode
npm run test:watch

# Template validation
npm run test-templates
```

### Build & Quality Checks
```bash
# Build project
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Full validation (tests + lint + types)
npm run validate
```

## Key Configuration

### Main Configuration (src/run-feature.ts)
- `mainRepoPath`: Points to actual project repository (`/Users/nickschrock/git/stays`)
- `baseWorktreePath`: Where worktrees are created (`/Users/nickschrock/git`)
- `maxConcurrentTasks`: Parallel task execution limit (default: 2)
- `requiredApprovals`: Number of reviewer approvals needed (default: 3)
- `reviewerProfiles`: Types of reviewers (`['frontend', 'backend', 'devops']`)

### Dependencies
- **Claude Code CLI**: Must be installed and accessible via `claude` command
- **GitHub CLI**: Must be authenticated (`gh auth status`)
- **Node.js/npm**: TypeScript execution via `tsx`

## Development Workflows

### Full Feature Development (Architecture → Implementation)
1. Run `npm run interactive` and select "Start New Feature"
2. System creates feature branch, worktree, and GitHub project
3. Architecture agent analyzes requirements and creates structured issues
4. Solver agents implement each issue with solve → review → approve cycle
5. System creates final feature PR with complete audit trail

### Working with Existing Issues
1. Use interactive CLI to browse active features and issues
2. Select specific issues or work on "next" issue in sequence
3. System handles worktree management and PR creation automatically

### Agent Templates
- `src/commands/arch.md`: Architecture planning workflow
- `src/commands/solve.md`: Implementation workflow with testing and PR creation
- `src/commands/review.md`: Multi-perspective code review workflow

## File Structure

```
src/
├── orchestrator.ts          # Main multi-agent coordinator
├── run-feature.ts           # CLI entry point and configuration
├── interactive.ts           # Interactive CLI interface
├── test-runner.ts           # Comprehensive test suite runner
├── test-templates.ts        # Agent template validation
└── commands/                # Agent instruction templates
    ├── arch.md              # Architecture agent instructions
    ├── solve.md             # Solver agent instructions
    └── review.md            # Reviewer agent instructions

tests/
├── unit/                    # Unit tests for core functionality
├── integration/             # Full workflow integration tests
└── fixtures/                # Test data and mocks
```

## Important Patterns

### Agent Template Variables
Agent templates use variable substitution with `$VARIABLE` syntax:
- `$FEATURE_NAME`, `$ISSUE_NUMBER`, `$PR_NUMBER`
- `$AGENT_ID`, `$ATTEMPT_NUMBER`, `$REVIEWER_PROFILE`
- `$WORKTREE_PATH`, `$MAIN_REPO_PATH`

### Error Handling & Retries
- Solver agents retry up to 3 times with reviewer feedback
- All reviewer agents must approve (3/3) for task completion
- Process cleanup handles interrupted Claude Code processes

### Worktree Lifecycle
1. Create feature branch and worktree
2. Copy `.claude` configuration to worktree
3. All agent work happens in isolated worktree
4. Worktrees can be cleaned up via interactive CLI

## Testing the System

### Prerequisites Check
```bash
claude --version     # Must be available
gh auth status       # Must be authenticated
npm run ui          # Access configuration menu to test setup
```

### Full System Test
```bash
npm run test        # Runs complete test suite including template validation
npm run validate    # Tests + lint + type checking
```

### Integration Testing
```bash
TEST_INTEGRATION=true npm run test:integration  # Full workflow tests
```

When working with this system, always verify Claude Code CLI availability and GitHub authentication before attempting to run agents. The interactive CLI provides the most user-friendly way to work with features and issues.