### Issue #35 - 2025-08-12
- Updated API service to use shared utilities from core package
- Created comprehensive web endpoints for all CLI functionality
- Added WorktreeController for worktree management via API
- Added SystemController for system status and branch operations
- Enhanced ProjectsController with configuration and branch management
- Achieved feature parity between CLI and web interfaces

### Issue #34 - 2025-08-11
- Extracted Git worktree and branch management utilities from interactive.ts
- Created reusable utility modules in packages/core/src/utils/
- Added comprehensive type definitions for worktree and branch operations
- Updated interactive.ts to use the new shared utilities
- Added unit tests for the new utility functions

### Issue #33 - 2025-08-11
- Fixed TypeScript type safety issues with proper interfaces for GitHub API responses
- Added input sanitization to prevent command injection in getFeatureIssues function
- Improved error handling with specific error types in catch blocks
- Created shared utility module structure for features, projects, config, issues, and status
- Extracted and refactored core feature management functions from interactive.ts

### Issue #35 - 2025-08-11
- Updated API service to use shared utilities from @codettea/core
- Fixed TypeScript errors in WorktreeService and ProjectsService
- Ensured all API endpoints have feature parity with CLI

