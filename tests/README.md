# Multi-Agent System Test Suite

Comprehensive testing framework for the multi-agent feature development system.

## Overview

This test suite ensures the reliability, maintainability, and correctness of the multi-agent system through multiple layers of testing:

- **Unit Tests** - Test individual functions and components
- **Integration Tests** - Test system interactions and workflows  
- **Template Validation** - Ensure agent prompts work correctly
- **Type Checking** - Verify TypeScript type safety
- **Linting** - Maintain code quality and consistency

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run with our comprehensive test runner
tsx test-runner.ts

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:coverage
```

### Test Categories

#### Unit Tests
```bash
npm run test:unit
```
Tests individual components in isolation:
- Orchestrator logic and task management
- Interactive CLI utilities and validation
- Template system variable replacement
- Argument parsing and configuration
- Error handling and edge cases

#### Integration Tests  
```bash
# Requires system setup
TEST_INTEGRATION=true npm run test:integration
```
Tests system-wide functionality:
- Full workflow execution
- Git operations and worktree management
- GitHub CLI integration
- Claude Code CLI integration
- File system operations
- Error handling across components

#### Coverage Report
```bash
npm run test:coverage
```
Generates detailed coverage report in `coverage/` directory.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── orchestrator.test.ts      # Tests src/orchestrator.ts
│   ├── interactive.test.ts       # Tests src/interactive.ts
│   ├── run-feature.test.ts       # Tests src/run-feature.ts
│   └── template-system.test.ts   # Tests src/commands/*.md
├── integration/             # End-to-end system tests
│   └── full-workflow.test.ts     # Tests complete workflows
├── fixtures/                # Test data and mock objects
│   └── mock-data.ts              # Mock data for all tests
├── setup.ts                # Jest configuration and utilities
└── README.md               # This file
```

## Mock Data

The test suite uses comprehensive mock data in `tests/fixtures/mock-data.ts`:

- **mockFeatureSpecs** - Sample feature specifications
- **mockTasks** - Sample task objects with various states
- **mockReviews** - Sample approve/reject review responses
- **mockGitHubIssues** - Sample GitHub issue data
- **mockTemplates** - Sample agent prompt templates
- **mockCommandOutputs** - Sample CLI command outputs

## Testing Utilities

### Custom Jest Matchers
```typescript
// Validate feature names
expect('user-auth').toBeValidFeatureName();

// Check template variables
expect(template).toContainVariables(['ISSUE_NUMBER', 'FEATURE_NAME']);

// Verify execution directory
expect(mockExec).toHaveBeenExecutedInDirectory('/path/to/worktree');
```

### Global Test Utilities
```typescript
// Available in all tests via global.testUtils
const { delay, captureConsole, mockFileSystem } = global.testUtils;

// Test async behavior
await testUtils.delay(100);

// Capture console output
const console = testUtils.captureConsole();
// ... run code that logs ...
expect(console.logs).toContain('Expected message');
console.restore();

// Mock file system
const fs = testUtils.mockFileSystem();
fs.mockReadFile('/path/to/file', 'content');
expect(fs.hasFile('/path/to/file')).toBe(true);
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Coverage Thresholds**: 80% for all metrics
- **Test Environment**: Node.js
- **Timeout**: 10 seconds per test
- **Parallel Execution**: 50% of available CPU cores

### ESLint Configuration (`.eslintrc.js`) 
- Relaxed rules for test files
- TypeScript strict mode
- Custom rules for CLI and interactive components
- Jest-specific linting rules

## Writing Tests

### Unit Test Example
```typescript
describe('MultiAgentOrchestrator', () => {
  let orchestrator: MultiAgentFeatureOrchestrator;

  beforeEach(() => {
    orchestrator = new MultiAgentFeatureOrchestrator(mockConfig, 'test-feature');
    jest.clearAllMocks();
  });

  it('should customize prompt template correctly', () => {
    const result = orchestrator.customizePromptTemplate(
      'Issue: $ISSUE_NUMBER', 
      { ISSUE_NUMBER: '123' }
    );
    expect(result).toBe('Issue: 123');
  });
});
```

### Integration Test Example  
```typescript
describe('Full Workflow', () => {
  beforeAll(async () => {
    if (process.env.TEST_INTEGRATION !== 'true') {
      test.skip = true;
      return;
    }
    await setupTestEnvironment();
  });

  it('should handle end-to-end feature development', async () => {
    const orchestrator = new MultiAgentFeatureOrchestrator(testConfig, 'test');
    await expect(orchestrator.executeFeature(mockSpec)).resolves.not.toThrow();
  });
});
```

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: |
    npm ci
    npm run test:coverage
    npm run lint
    npm run type-check
    tsx test-runner.ts

- name: Integration Tests
  run: TEST_INTEGRATION=true npm run test:integration
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hooks
```bash
# Install pre-commit hooks
npm run prepare

# Runs automatically on commit:
# - Unit tests
# - Linting
# - Type checking
# - Template validation
```

## Coverage Goals

| Component | Target Coverage | Current |
|-----------|----------------|---------|
| Orchestrator | 90% | - |
| Interactive CLI | 85% | - |
| Template System | 95% | - |
| Run Feature | 80% | - |
| Overall | 85% | - |

## Test Development Guidelines

### Best Practices
1. **Isolate Tests** - Each test should be independent
2. **Mock External Dependencies** - Don't call real APIs or file system
3. **Test Edge Cases** - Include error conditions and boundary values
4. **Use Descriptive Names** - Test names should explain what they verify
5. **Keep Tests Fast** - Unit tests should complete in milliseconds

### What to Test
- **Happy Path** - Normal operation scenarios
- **Error Handling** - How system responds to failures
- **Edge Cases** - Boundary conditions and unusual inputs
- **Integration Points** - Interfaces between components
- **Configuration** - Different settings and environments

### What Not to Test
- **External Libraries** - Assume Jest, TypeScript work correctly
- **Node.js Built-ins** - Don't test fs, path, etc.
- **Obvious Code** - Simple getters/setters, trivial functions

## Debugging Tests

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout
jest.setTimeout(30000);

# Or set environment variable
JEST_TIMEOUT=30000 npm test
```

#### Mocks Not Working
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules for fresh imports
beforeEach(() => {
  jest.resetModules();
});
```

#### Coverage Issues
```bash
# See what's not covered
npm run test:coverage

# Focus on specific files
npm run test -- --collectCoverageFrom="orchestrator.ts"
```

### Debug Commands
```bash
# Run single test file
npm test -- orchestrator.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"

# Run tests in watch mode
npm run test:watch

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Testing

### Benchmarks
- **Template Processing**: < 10ms per template
- **Task Orchestration**: < 100ms for dependency resolution
- **File Operations**: < 50ms per file
- **Git Operations**: < 2s per worktree operation

### Load Testing
```bash
# Test with multiple concurrent features
TEST_LOAD=true npm run test:integration
```

## Maintenance

### Regular Tasks
- Update mock data as system evolves
- Review and update coverage thresholds
- Add tests for new features and bug fixes
- Refactor tests as code structure changes

### Health Checks
```bash
# Full system validation
tsx test-runner.ts

# Coverage trend
npm run test:coverage && echo "Coverage trend: $(cat coverage/lcov.info | grep -c 'SF:')"

# Test performance
npm test -- --verbose --detectOpenHandles
```

This comprehensive test suite ensures the multi-agent system remains reliable and maintainable as it evolves.