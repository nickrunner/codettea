# Multi-Agent Command Templates

This directory contains specialized command templates optimized for multi-agent feature development.

## Templates

### `solve.md`
**Purpose**: Guides solver agents through implementing GitHub issues  
**Key Features**:
- Worktree-aware git operations
- Test-driven development workflow
- Comprehensive quality checks
- Multi-agent coordination guidelines
- Retry handling with previous feedback

**Variables**:
- `$ISSUE_NUMBER` - GitHub issue number being solved
- `$FEATURE_NAME` - Name of the feature being developed
- `$ATTEMPT_NUMBER` - Current attempt (1, 2, or 3)
- `$MAX_ATTEMPTS` - Maximum retry attempts allowed
- `$AGENT_ID` - Unique identifier for this solver agent
- `$WORKTREE_PATH` - Path to the git worktree
- `$BASE_BRANCH` - Base branch for the feature

### `review.md`
**Purpose**: Guides reviewer agents through comprehensive code reviews  
**Key Features**:
- Profile-specific review focus (frontend/backend/devops)
- Structured feedback format
- Multi-agent coordination checks
- Clear approve/reject criteria
- Integration with GitHub CLI

**Variables**:
- `$PR_NUMBER` - Pull request number being reviewed
- `$ISSUE_NUMBER` - Related GitHub issue number
- `$FEATURE_NAME` - Name of the feature being developed
- `$REVIEWER_PROFILE` - Type of reviewer (frontend/backend/devops)
- `$AGENT_ID` - Unique identifier for this reviewer agent
- `$WORKTREE_PATH` - Path to the git worktree
- `$ATTEMPT_NUMBER` - Which attempt this is for the task

## Reviewer Profiles

### Frontend (`$REVIEWER_PROFILE = "frontend"`)
Focuses on:
- React component patterns and hooks
- TypeScript type safety
- Material-UI usage
- State management (React Query/SWR)
- Accessibility and performance
- Component reusability

### Backend (`$REVIEWER_PROFILE = "backend"`)
Focuses on:
- Express.js and TSOA patterns
- Database design and queries
- API design and RESTful principles
- Security and validation
- Error handling
- Performance and scalability

### DevOps (`$REVIEWER_PROFILE = "devops"`)
Focuses on:
- Build configuration
- Test coverage and CI/CD
- Docker and deployment
- Monitoring and logging
- Security and secrets
- Performance monitoring

## Customization

To modify the templates:

1. Edit the `.md` files directly
2. Add new variables using `$VARIABLE_NAME` format
3. Update the orchestrator to pass new variables
4. Test with `npm run test-templates`

## Testing

```bash
# Test template variable substitution
npm run test-templates

# Test with actual agent (requires API key)
export ANTHROPIC_API_KEY="your-key"
./run-feature.ts test-feature 999 --parent-feature
```

## Best Practices

### For Solve Templates
- Keep instructions atomic and focused
- Provide clear success criteria
- Include error recovery steps
- Emphasize multi-agent coordination

### For Review Templates
- Be specific about what to check
- Provide constructive feedback format
- Include profile-specific guidelines
- Focus on blocking vs. non-blocking issues

### Variable Usage
- Use descriptive variable names
- Document all variables in README
- Provide defaults where sensible
- Test edge cases (missing variables)