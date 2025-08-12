### Issue #34 - 2025-08-11
- Extracted Git worktree and branch management utilities from interactive.ts into reusable modules
- Fixed bug in getWorktreeList where isMain flag wasn't correctly set for worktrees
- Added comprehensive test coverage for worktree and branch utilities
- All utilities now properly typed and exported through packages/core/src/utils/index.ts

