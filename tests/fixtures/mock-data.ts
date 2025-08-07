// Mock data for testing the multi-agent system

export const mockFeatureSpecs = {
  architectureMode: {
    name: 'user-authentication',
    description: 'Implement comprehensive user authentication with JWT tokens, password reset, and email verification',
    baseBranch: 'dev',
    issues: undefined,
    isParentFeature: true,
    architectureMode: true
  },
  
  issueMode: {
    name: 'payment-integration',
    description: 'Implementation of issues: 123, 124, 125',
    baseBranch: 'feature/payment-integration',
    issues: [123, 124, 125],
    isParentFeature: false,
    architectureMode: false
  }
};

export const mockTasks = [
  {
    issueNumber: 123,
    title: 'Create user authentication models',
    description: 'Define TypeScript interfaces and database models for user authentication',
    dependencies: [],
    status: 'pending' as const,
    attempts: 0,
    maxAttempts: 3,
    reviewHistory: [],
    worktreePath: '/mock/worktrees/stays-user-auth'
  },
  
  {
    issueNumber: 124,
    title: 'Implement JWT token service',
    description: 'Create service for generating and validating JWT tokens',
    dependencies: [123],
    status: 'pending' as const,
    attempts: 1,
    maxAttempts: 3,
    reviewHistory: [
      {
        reviewerId: 'reviewer-0',
        result: 'REJECT' as const,
        comments: 'Need to add token expiration handling',
        timestamp: Date.now() - 3600000
      }
    ],
    worktreePath: '/mock/worktrees/stays-user-auth'
  },
  
  {
    issueNumber: 125,
    title: 'Create login API endpoints',
    description: 'Implement REST endpoints for user login and logout',
    dependencies: [123, 124],
    status: 'completed' as const,
    attempts: 1,
    maxAttempts: 3,
    reviewHistory: [
      {
        reviewerId: 'reviewer-0',
        result: 'APPROVE' as const,
        comments: 'Well implemented with proper error handling',
        timestamp: Date.now() - 1800000
      },
      {
        reviewerId: 'reviewer-1',
        result: 'APPROVE' as const,
        comments: 'Backend implementation looks solid',
        timestamp: Date.now() - 1700000
      },
      {
        reviewerId: 'reviewer-2',
        result: 'APPROVE' as const,
        comments: 'Tests are comprehensive',
        timestamp: Date.now() - 1600000
      }
    ],
    worktreePath: '/mock/worktrees/stays-user-auth',
    branch: 'feature/user-auth-step-125',
    prNumber: 456
  }
];

export const mockReviews = {
  approve: {
    reviewerId: 'reviewer-frontend',
    result: 'APPROVE' as const,
    comments: `## ✅ APPROVE

**Reviewer**: frontend | Agent: reviewer-frontend

### Summary
The authentication components are well-structured and follow React best practices.

### Strengths
- Proper TypeScript typing throughout
- Good separation of concerns between components
- Accessible form design with proper ARIA labels
- Comprehensive error handling

### Minor Suggestions
- Consider adding loading states for better UX
- Add unit tests for edge cases

**Multi-Agent Notes**: This change is ready for integration and won't block other agents' work.`,
    timestamp: Date.now()
  },
  
  reject: {
    reviewerId: 'reviewer-backend',
    result: 'REJECT' as const,
    comments: `## ❌ REJECT

**Reviewer**: backend | Agent: reviewer-backend

### Critical Issues
The authentication service has several issues that must be addressed.

### Detailed Feedback

#### Code Quality Issues
- **File**: \`src/auth/authService.ts\` **Line**: 45
  **Issue**: Password hashing is not using proper salt rounds
  **Solution**: Use bcrypt with at least 12 salt rounds

- **File**: \`src/auth/tokenService.ts\` **Line**: 23-30  
  **Issue**: JWT secrets are hardcoded
  **Solution**: Load from environment variables with proper validation

#### Security Issues
- Missing input sanitization for email addresses
- Token expiration time is too long (24 hours)
- No rate limiting on login attempts

### Retry Guidance
Please address the critical security issues above and re-submit. Focus on:
1. Proper password hashing implementation
2. Secure JWT secret management
3. Input validation and sanitization

**Multi-Agent Notes**: These security issues should be resolved before other agents build upon this work.`,
    timestamp: Date.now()
  }
};

export const mockGitHubIssues = [
  {
    number: 123,
    title: 'user-authentication - Step 1: Create authentication models',
    body: `## Overview
Part of feature: user-authentication

## Task Description  
Define TypeScript interfaces and database models for user authentication including User, Session, and AuthToken models.

## Acceptance Criteria
- [ ] User interface with email, password hash, and profile fields
- [ ] Session model for tracking user sessions
- [ ] AuthToken model for JWT token management
- [ ] Proper TypeScript exports and imports

## Technical Requirements
- [ ] All existing tests pass
- [ ] New functionality is tested  
- [ ] TypeScript types are properly defined
- [ ] Code follows existing patterns
- [ ] Documentation is updated

## Files Likely to Change
- \`packages/@staysco/models/src/User.ts\`
- \`packages/@staysco/models/src/Session.ts\`
- \`packages/@staysco/models/src/AuthToken.ts\`

## Multi-Agent Context
This issue will be solved by automated solver agents.
Worktree: /Users/nickschrock/git/stays-user-authentication
Feature Branch: feature/user-authentication`,
    state: 'open',
    labels: [
      { name: 'enhancement' },
      { name: 'user-authentication' },
      { name: 'backend' }
    ],
    assignees: []
  },
  
  {
    number: 124,
    title: 'user-authentication - Step 2: Implement JWT service',
    body: `## Overview
Part of feature: user-authentication

## Task Description  
Create a comprehensive JWT token service for user authentication.

## Acceptance Criteria
- [ ] Generate JWT tokens with proper claims
- [ ] Validate JWT tokens and handle expiration
- [ ] Refresh token functionality
- [ ] Secure secret management

## Dependencies
Depends on #123

## Files Likely to Change
- \`apps/stays-platform/src/auth/jwtService.ts\`
- \`apps/stays-platform/src/auth/authMiddleware.ts\``,
    state: 'open',
    labels: [
      { name: 'enhancement' },
      { name: 'user-authentication' },
      { name: 'backend' }
    ],
    assignees: []
  }
];

export const mockWorktrees = [
  {
    path: '/Users/nickschrock/git/stays',
    branch: 'main',
    isMain: true
  },
  {
    path: '/Users/nickschrock/git/stays-user-auth',
    branch: 'feature/user-auth',
    isMain: false
  },
  {
    path: '/Users/nickschrock/git/stays-payment-system',
    branch: 'feature/payment-system',
    isMain: false
  }
];

export const mockConfig = {
  mainRepoPath: '/Users/nickschrock/git/stays',
  baseWorktreePath: '/Users/nickschrock/git',
  maxConcurrentTasks: 2,
  requiredApprovals: 3,
  reviewerProfiles: ['frontend', 'backend', 'devops']
};

export const mockTemplates = {
  architecture: `# Multi-Agent Architecture Agent Instructions

You are an **Architecture Agent** in a multi-agent feature development system.

## Architecture Context
- **Feature Request**: $FEATURE_REQUEST
- **Agent ID**: $AGENT_ID
- **Base Directory**: $MAIN_REPO_PATH
- **Target Worktree**: $WORKTREE_PATH

## Critical Requirements

### 🎯 Feature Planning Process
Analyze the problem statement and create a comprehensive technical design.`,

  solve: `# Multi-Agent Solver Agent Instructions

You are a **Solver Agent** in a multi-agent feature development system.

## Task Context
- **Issue Number**: $ISSUE_NUMBER
- **Feature Name**: $FEATURE_NAME  
- **Attempt Number**: $ATTEMPT_NUMBER of $MAX_ATTEMPTS
- **Agent ID**: $AGENT_ID
- **Worktree Path**: $WORKTREE_PATH
- **Base Branch**: $BASE_BRANCH`,

  review: `# Multi-Agent Reviewer Agent Instructions

You are a **Reviewer Agent** in a multi-agent feature development system.

## Review Context
- **PR Number**: #$PR_NUMBER
- **Issue Number**: #$ISSUE_NUMBER  
- **Feature Name**: $FEATURE_NAME
- **Reviewer Profile**: $REVIEWER_PROFILE
- **Agent ID**: $AGENT_ID
- **Worktree Path**: $WORKTREE_PATH`
};

export const mockCommandOutputs = {
  claudeCodeVersion: 'Claude Code CLI v1.2.3',
  
  gitStatus: `On branch feature/user-auth
Your branch is up to date with 'origin/feature/user-auth'.

nothing to commit, working tree clean`,

  gitWorktreeList: `/Users/nickschrock/git/stays  [main]
/Users/nickschrock/git/stays-user-auth  feature/user-auth
/Users/nickschrock/git/stays-payment  feature/payment-system`,

  ghIssueList: `[
  {
    "number": 123,
    "title": "Create authentication models",
    "state": "open",
    "labels": ["backend", "user-auth"]
  },
  {
    "number": 124,
    "title": "Implement JWT service", 
    "state": "open",
    "labels": ["backend", "user-auth"]
  }
]`,

  ghAuthStatus: `✓ Logged in to github.com as developer (keyring)
✓ Git operations for github.com configured to use https protocol.
✓ Token: *******************`,

  npmRunBuild: `> multi-agent-feature-dev@1.0.0 build
> tsc

Compiled successfully!`,

  gitBranchShowCurrent: 'feature/user-authentication'
};

// Helper functions for creating test data
export function createMockTask(overrides: Partial<typeof mockTasks[0]> = {}) {
  return {
    ...mockTasks[0],
    ...overrides
  };
}

export function createMockReview(type: 'approve' | 'reject' = 'approve') {
  return {
    ...mockReviews[type],
    timestamp: Date.now()
  };
}

export function createMockFeatureSpec(mode: 'architecture' | 'issue' = 'architecture') {
  return mode === 'architecture' 
    ? { ...mockFeatureSpecs.architectureMode }
    : { ...mockFeatureSpecs.issueMode };
}