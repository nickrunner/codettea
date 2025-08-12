### Issue #34 - 2025-08-11
- Extracted Git worktree and branch management utilities from interactive.ts
- Created reusable utility modules in packages/core/src/utils/
- Added comprehensive type definitions for worktree and branch operations
- Updated interactive.ts to use the new shared utilities
- Added unit tests for the new utility functions

### Issue #34 - 2025-08-11
- Fixed TypeScript compilation errors in packages/web by adding CSS module type declarations
- Improved error handling in showWorktreeStatus function with partial status objects
- Added retry logic for git commands to handle transient failures
- Fixed test failures in unit and integration tests
- Enhanced worktree management reliability with automatic retries

