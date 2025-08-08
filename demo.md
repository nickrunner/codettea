# Multi-Agent Feature Development Demo

## Interactive CLI Walkthrough

### 1. Launch Interactive Mode
```bash
cd /Users/nickschrock/git/multi-agent-dev
npm run ui
# or use the wrapper script
./interactive
```

### 2. Start New Feature
Select option `1. 🏗️ Start New Feature`

**Example Input:**
- Feature name: `user-dashboard`
- Description: `Create a user dashboard with analytics, recent activity, and profile management`

**What Happens:**
1. 🏗️ Architecture agent analyzes requirements
2. 🌳 Creates `feature/user-dashboard` branch and worktree
3. 📋 Creates GitHub project with issues
4. 🔧 Solver agents implement each issue
5. 👥 3 reviewer agents approve each implementation
6. 🚀 Final PR created

### 3. View System Status  
Select option `3. 📊 View Current Status`

**Shows:**
- 🔑 API key configuration
- 🌿 Active feature branches
- 📋 Recent GitHub issues
- 🌳 Current worktrees
- ⚡ Git repository status

### 4. Work on Existing Issues
Select option `2. 🔧 Work on Existing Issues`

**Features:**
- 📋 Browse existing features and their issues
- 🔍 Filter by feature or select specific issue numbers
- 📊 View progress (open vs completed issues)
- 🚀 Start implementation immediately

### 5. Manage Worktrees
Select option `4. 🌳 Manage Worktrees`

**Actions:**
- 📁 List all current worktrees
- ➕ Create new worktrees for features
- 🗑️ Remove unused worktrees
- 🧹 Clean up stale references

### 6. Configuration Management
Select option `5. ⚙️ Configuration`

**Settings:**
- 🔑 Set/update API key
- 📁 Configure repo and worktree paths
- 🔧 Adjust task limits and approval requirements
- 🧪 Test configuration validity

## Example Session Flow

```
🤖 Multi-Agent Feature Development System
==========================================

Welcome to the interactive CLI for automated feature development!

Environment:
• Main Repo: /Users/username/git/project-name
• Worktree Base: /Users/nickschrock/git
• Claude Code: ✅ Available

📋 What would you like to do?

  1. 🏗️  Start New Feature (Full Architecture + Implementation)
  2. 🔧  Work on Existing Issues
  3. 📊  View Current Status
  4. 🌳  Manage Worktrees
  5. ⚙️  Configuration
  6. ❌  Exit

🤖 Select an option (1-6): 1

🏗️  New Feature Development
============================

This will create a complete feature from concept to production:

1. 📋 Architecture Planning - Analyze requirements and create technical design
2. 🌳 Infrastructure Setup - Create feature branch, worktree, and GitHub project  
3. 📝 Issue Creation - Break down into atomic, testable tasks
4. 🔧 Implementation - Multi-agent solve → review → approve cycle
5. 🚀 Integration - Final feature PR with complete audit trail

📝 Feature name (kebab-case, e.g., "user-auth"): payment-integration

📖 Feature description examples:
  • "Implement user authentication with JWT tokens and password reset"
  • "Add Stripe payment processing with webhook handling"
  • "Create dashboard analytics with real-time metrics"

📝 Feature description: Add Stripe payment processing with subscription management and webhook handling

🔍 Preview:
    
🏷️  Feature: payment-integration
📖 Description: Add Stripe payment processing with subscription management and webhook handling
🌿 Branch: feature/payment-integration  
🌳 Worktree: /Users/username/git/project-name-payment-integration
🤖 Mode: Architecture + Implementation

✅ Start feature development? (y/N): y

🚀 Starting full feature development...

🏗️ Running architecture phase for: payment-integration
🤖 Calling architecture agent...
✅ Architecture phase complete. Created 5 issues: 789, 790, 791, 792, 793

🌳 Setting up worktree for payment-integration
📋 Loading 5 GitHub issues as tasks
🔧 Starting implementation phase...

📋 Starting task: #789 - payment-integration - Step 1: Create Stripe payment models
🤖 Calling solver agent for issue #789
🔍 Reviewing PR #156 for task #789
👨‍💻 reviewer-0 (frontend) reviewing PR #156
👨‍💻 reviewer-1 (backend) reviewing PR #156  
👨‍💻 reviewer-2 (devops) reviewing PR #156
✅ Task completed: #789

📋 Starting task: #790 - payment-integration - Step 2: Implement subscription service
🤖 Calling solver agent for issue #790
...

🎉 Feature development completed successfully!

📋 Press Enter to return to main menu...
```

## Benefits of Interactive CLI

### 🎯 User-Friendly
- No need to memorize complex commands
- Guided workflows prevent mistakes
- Visual feedback and progress tracking
- Clear error messages and help text

### 📊 Visibility  
- Real-time status of all features
- Progress tracking for issues
- Worktree management with visual overview
- Configuration validation and testing

### 🔧 Flexibility
- Choose between full feature development or specific issues
- Browse existing features and their status
- Easy worktree management
- Quick configuration adjustments

### 🚀 Productivity
- Faster feature development start
- Reduced context switching
- Better oversight of parallel development
- Streamlined troubleshooting

## Advanced Usage

### Batch Operations
Start multiple features in sequence:
1. Configure system once
2. Run feature 1 → let it complete
3. Start feature 2 while reviewing feature 1 results
4. Scale based on system capacity

### Integration with CI/CD
The CLI can be used in automation:
```bash
# In CI/CD pipeline
ANTHROPIC_API_KEY=$SECRET_KEY npm run interactive -- --auto --feature-file features.json
```

### Monitoring and Logging
All operations are logged for audit trail:
- Agent decisions and rationale
- Review feedback and iterations
- Performance metrics
- Error tracking and resolution