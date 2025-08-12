# Method Extraction Architecture

## Overview
This feature extracts common utility functions from the interactive.ts CLI into shared modules that can be consumed by both the terminal interface and web API service. This ensures feature parity between CLI and web interfaces while maintaining DRY principles.

## Problem Statement
The interactive.ts file contains all business logic for feature management, git operations, and system utilities. The web API currently reimplements some of this functionality, leading to:
- Code duplication and maintenance burden
- Feature disparity between CLI and web interfaces
- Inconsistent behavior across interfaces
- Difficulty adding new features to both interfaces

## Solution Architecture

### Module Structure
```
packages/core/src/utils/
├── features.ts       # Feature management (list, create, work on)
├── projects.ts       # Project discovery and selection
├── config.ts         # Configuration management
├── issues.ts         # Issue parsing and management
├── status.ts         # System status utilities
├── branches.ts       # Branch management and cleanup
├── worktreeManager.ts # Extended worktree operations
└── index.ts          # Unified exports
```

### Key Design Decisions

1. **Modular Separation**: Functions are grouped by domain (features, projects, git, etc.) rather than by origin file. This creates more cohesive modules.

2. **Backward Compatibility**: All functions maintain their original signatures to ensure interactive.ts continues working without modification initially.

3. **Progressive Enhancement**: The API service will be updated to use shared utilities incrementally, allowing for gradual migration.

4. **Type Safety**: All utilities are fully typed with TypeScript interfaces, ensuring type safety across both CLI and API consumers.

5. **Error Handling**: Utilities handle errors gracefully and return predictable results, making them safe to use in different contexts.

## Implementation Phases

### Phase 1: Core Utility Extraction (Issue #33)
- Create module structure
- Extract feature management functions
- Extract project and configuration utilities
- Update interactive.ts to use shared modules

### Phase 2: Git Operations (Issue #34)
- Extract worktree management
- Extract branch cleanup utilities
- Consolidate git operations
- Add safety checks and validation

### Phase 3: API Integration (Issue #35)
- Update FeaturesService to use shared utilities
- Create new controllers for full feature parity
- Add comprehensive API endpoints
- Ensure proper error handling and validation

## Technical Considerations

### Dependencies
- Maintains existing dependencies on GitUtils, GitHubUtils, ClaudeAgent
- No new external dependencies required
- Uses existing @codettea/core package structure

### Testing Strategy
- Unit tests for each utility function
- Integration tests for API endpoints
- Regression tests for interactive.ts
- End-to-end tests for critical workflows

### Migration Path
1. Extract utilities with backward compatibility
2. Update interactive.ts to use shared utilities
3. Update API services incrementally
4. Add new API endpoints for missing functionality
5. Validate feature parity between interfaces

## Benefits

1. **Code Reusability**: Single source of truth for business logic
2. **Consistency**: Same behavior across CLI and web interfaces
3. **Maintainability**: Changes in one place affect all consumers
4. **Extensibility**: Easy to add new features to both interfaces
5. **Testing**: Utilities can be tested in isolation
6. **Type Safety**: Shared TypeScript types ensure consistency

## Risk Mitigation

- **Breaking Changes**: All changes maintain backward compatibility
- **Testing Coverage**: Comprehensive tests before deployment
- **Gradual Migration**: Phase approach allows for validation at each step
- **Rollback Plan**: Git worktree structure allows easy rollback

## Success Metrics

- All interactive.ts functionality available via API
- No regression in existing features
- Reduced code duplication (target: 60% reduction)
- Improved test coverage (target: >80%)
- Successful deployment without breaking changes

## Future Enhancements

After successful extraction, consider:
- Adding caching layer for expensive operations
- Creating SDK for external consumers
- Adding WebSocket support for real-time updates
- Building CLI using API client for true single source
<<<<<<< HEAD
=======


## Phase 3: API Integration (Issue #35) - COMPLETED (Attempt 2)

Successfully updated the API service to achieve feature parity between CLI and web interfaces:

- **Services Updated**:
  - FeaturesService now uses shared utilities from @codettea/core
  - All duplicate code removed in favor of shared implementations
  - New methods added for working on issues and worktree management

- **New Controllers Created**:
  - WorktreeController: Full worktree management (list, create, remove, cleanup)
  - SystemController: System status, Claude checks, branch cleanup operations
  - Enhanced ProjectsController: Configuration management, branch operations
  - Enhanced FeaturesController: Work on next/specific issues, add issues, worktree status

- **Endpoints Added**:
  - GET /features/active - List features with active worktrees
  - POST /features/{name}/work-next - Work on next issue in sequence
  - POST /features/{name}/work-issue - Work on specific issue
  - POST /features/{name}/add-issues - Add issues to feature
  - GET /features/{name}/details - Comprehensive feature details
  - GET /features/{name}/worktree-status - Check worktree status
  - GET/PUT /projects/{name}/config - Manage project configuration
  - POST /projects/{name}/select - Select active project
  - GET /projects/{name}/branches - List project branches
  - Full worktree and system management endpoints

- **Infrastructure Improvements (Attempt 2)**:
  - Added comprehensive test coverage for SystemController and WorktreeController
  - Fixed rate limiter to use express-rate-limit instead of custom implementation
  - Added CI/CD pipeline configuration with GitHub Actions for automated builds and deployments
  - CORS configuration verified and working for frontend access
  - All TypeScript compilation issues resolved
  - Updated mock files for proper testing of shared utilities

This completes the method extraction feature, achieving the goal of eliminating code duplication and ensuring feature parity between CLI and web interfaces.

>>>>>>> main
