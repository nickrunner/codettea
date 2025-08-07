# Multi-Agent Feature Development - Help

## Getting Started

### 1. Setup (One-time)

```bash
cd /Users/nickschrock/git/multi-agent-dev
npm install

# Ensure Claude Code CLI is available
claude-code --version

# Ensure GitHub CLI is authenticated
gh auth status
```

### 2. Launch Interactive CLI

```bash
npm run ui
```

### 3. Or Use Direct Commands

```bash
# Full feature development
./run-feature.ts feature-name "description" --arch

# Work on specific issues
./run-feature.ts feature-name 123 124 125
```

## Common Workflows

### 🆕 New Feature from Scratch

1. Launch interactive CLI (`npm run ui`)
2. Select "Start New Feature"
3. Enter feature name (kebab-case)
4. Enter detailed description
5. Confirm to start → System handles everything automatically

### 🔧 Work on Existing Issues

1. Launch interactive CLI
2. Select "Work on Existing Issues"
3. Choose feature or enter issue numbers
4. System executes solve → review → approve cycle

### 📊 Check Progress

1. Launch interactive CLI
2. Select "View Current Status"
3. See active features, issues, worktrees, and system health

## Key Concepts

### Architecture Agent 🏗️

- Analyzes feature requirements
- Creates technical design and architecture notes
- Sets up GitHub project and worktree
- Decomposes feature into atomic issues

### Solver Agents 🔧

- Implement individual GitHub issues
- Follow test-driven development
- Create PRs with comprehensive descriptions
- Handle retries with feedback

### Reviewer Agents 🔍

- 3 independent reviews per implementation
- Specialized profiles (frontend/backend/devops)
- Structured feedback with specific suggestions
- Automatic approval/rejection workflow

### Worktrees 🌳

- Isolated development environments
- Parallel feature development
- Clean separation of concerns
- Automatic cleanup and management

## File Structure

```
multi-agent-dev/
├── interactive.ts          # Interactive CLI
├── orchestrator.ts         # Core orchestration logic
├── run-feature.ts          # Direct command interface
├── prompts/               # Agent prompt templates
│   ├── arch.md            # Architecture agent prompts
│   ├── solve.md           # Solver agent prompts
│   ├── review.md          # Reviewer agent prompts
│   └── README.md          # Command documentation
├── package.json           # Dependencies and scripts
├── README.md             # Main documentation
└── demo.md               # Usage examples
```

## Troubleshooting

### 🔧 Claude Code Issues

```bash
# Check if Claude Code is installed
claude-code --version

# Check if it's in PATH
which claude-code

# Test basic functionality
claude-code --help
```

**Installation:**

1. Visit https://claude.ai/code
2. Download and install Claude Code CLI
3. Ensure it's in your system PATH
4. Verify with: `claude-code --version`

### 🌳 Worktree Problems

```bash
# List all worktrees
git worktree list

# Remove stuck worktree
git worktree remove --force ../stays-feature-name

# Clean up references
git worktree prune
```

### 📋 GitHub CLI Issues

```bash
# Check authentication
gh auth status

# Login if needed
gh auth login

# Test basic functionality
gh issue list --limit 5
```

### 🔧 Build/Test Failures

- Check TypeScript errors: `npm run build`
- Verify dependencies: `npm install`
- Test configuration: Use interactive CLI → Configuration → Test

### 🚫 Permission Denied

```bash
# Make scripts executable
chmod +x run-feature.ts interactive.ts

# Check file permissions
ls -la *.ts
```

### 💰 Cost & Billing

- **No API Credits Needed**: Uses your Claude Code subscription
- **No Additional Charges**: Agents run through your existing plan
- **Usage Monitoring**: Track through Claude Code interface
- **Subscription Limits**: Be aware of your plan's usage constraints

## Tips and Best Practices

### 📝 Feature Descriptions

**Good:**

- "Implement user authentication with JWT tokens, password reset, and email verification"
- "Add Stripe payment processing with subscription management and webhook handling"
- "Create analytics dashboard with real-time metrics and export functionality"

**Avoid:**

- "Fix users" (too vague)
- "Update authentication" (not specific)
- "Make payments work" (unclear requirements)

### 🏷️ Feature Names

**Good:**

- `user-auth`
- `payment-integration`
- `analytics-dashboard`

**Avoid:**

- `userAuth` (use kebab-case)
- `fix_payments` (use hyphens not underscores)
- `feature1` (not descriptive)

### ⚡ Performance

- Start with 2 max concurrent tasks
- Increase based on system capacity
- Monitor CPU/memory usage during development
- Use worktrees to isolate resource usage

### 🔍 Monitoring

- Check system status regularly
- Review agent feedback for quality
- Monitor worktree disk usage
- Track GitHub API rate limits

## Getting Help

### 📚 Documentation

- `README.md` - Overview and setup
- `demo.md` - Example workflows
- `prompts/README.md` - Agent prompt documentation
- `help.md` - This file

### 🐛 Issues and Support

- Check configuration: Interactive CLI → Configuration → Test
- Verify Claude Code CLI is installed and working
- Review logs for error details
- Verify GitHub CLI authentication
- Ensure worktrees have sufficient disk space

### 🔧 Common Commands

```bash
# Interactive mode (recommended)
npm run ui

# Test templates
npm run test-templates

# Direct feature development
./run-feature.ts feature-name "description" --arch

# Work on issues
./run-feature.ts feature-name 123 124

# System verification
claude-code --version && gh auth status

# Check worktrees
git worktree list

# GitHub status
gh issue list --limit 3
```
