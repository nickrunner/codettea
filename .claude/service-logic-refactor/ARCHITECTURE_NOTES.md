# Architecture Notes: service-logic-refactor

## Problem Statement
Split out common utilities into separate, reusable functions in their own files. Things like github cli interactions, git interactions, claude interactions, prompt generation and whatever else you think of should be strategically organized to reduce the bloat on the orchestrator and interactive code. The orchestrator is currently too hard to read and maintain.

## System Components Affected

### Frontend
- [ ] Components: N/A
- [ ] Pages: N/A  
- [ ] State Management: N/A
- [ ] Routing: N/A

### Backend
- [x] Controllers: N/A
- [x] Services: Orchestrator and Interactive modules need major refactoring
- [ ] Models: N/A
- [ ] APIs: N/A

### Data Layer
- [ ] Collections: N/A
- [ ] Fields: N/A
- [ ] Permissions: N/A
- [ ] Validation: N/A

### Shared/Common
- [x] Type definitions: May need to extract shared types
- [x] Utilities: Core refactoring target - extract utilities
- [x] Constants: Configuration constants should be centralized
- [ ] Validation: N/A

## Database Impact
- No database changes required

## API Design
- No API changes required

## Integration Points
- GitHub CLI operations
- Git operations
- Claude Code CLI operations
- File system operations
- Process management

## Performance Considerations
- Improved code organization will make maintenance easier
- Modular utilities will enable better testing
- Reduced coupling between components

## Security Considerations
- Maintain existing security practices
- Ensure proper error handling in extracted utilities

## Proposed Architecture

### 1. Utility Modules to Create

#### `src/utils/git.ts`
- Git operations (checkout, branch, push, pull, worktree management)
- Branch utilities (getCurrentBranch, getDefaultBranch, isBranchInWorktree)
- Worktree management (create, check existence, remove)

#### `src/utils/github.ts`
- Issue operations (create, view, close, list, search)
- PR operations (create, view, list, review, search)
- Project operations (create, update)
- Label management

#### `src/utils/claude.ts`
- Claude Code CLI interactions
- Prompt file management
- Agent execution with progress monitoring
- Response parsing
- Process cleanup

#### `src/utils/prompt.ts`
- Template loading and customization
- Variable substitution
- Prompt file creation and cleanup
- Shared prompt management for reviewers

#### `src/utils/filesystem.ts`
- File operations with proper error handling
- Directory management
- Configuration file copying
- Project discovery

#### `src/utils/process.ts`
- Process execution with timeout
- Signal handling
- Progress monitoring
- Output streaming

#### `src/config/index.ts`
- Centralized configuration management
- Dynamic configuration loading
- Project-specific settings
- Default values

#### `src/types/index.ts`
- Shared type definitions
- Interface exports
- Type guards

### 2. Refactoring Strategy

1. **Phase 1**: Extract utilities without changing functionality
2. **Phase 2**: Update orchestrator.ts to use new utilities
3. **Phase 3**: Update interactive.ts to use new utilities
4. **Phase 4**: Update run-feature.ts to use new utilities
5. **Phase 5**: Add comprehensive tests for utilities
6. **Phase 6**: Documentation and cleanup

### 3. Benefits

- **Maintainability**: Cleaner, more focused modules
- **Testability**: Isolated utilities are easier to test
- **Reusability**: Utilities can be used across different modules
- **Readability**: Reduced file sizes and clearer responsibilities
- **Extensibility**: Easier to add new features

### 4. Migration Path

Each utility module will:
1. Export clear, documented functions
2. Handle errors appropriately  
3. Use TypeScript for type safety
4. Include unit tests
5. Maintain backward compatibility during migration

### 5. Task Breakdown

The implementation will be broken into atomic tasks that can be completed independently:

1. Create base utility structure and types
2. Extract git utilities
3. Extract GitHub CLI utilities
4. Extract Claude Code utilities
5. Extract prompt management utilities
6. Extract filesystem utilities
7. Extract process management utilities
8. Create centralized configuration
9. Refactor orchestrator.ts to use utilities
10. Refactor interactive.ts to use utilities
11. Refactor run-feature.ts to use utilities
12. Add comprehensive tests
13. Update documentation
EOF < /dev/null