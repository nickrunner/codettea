// Jest setup file for multi-agent system tests

import { jest } from '@jest/globals';

// Global test configuration
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset console spies
  if (jest.isMockFunction(console.log)) {
    (console.log as jest.MockedFunction<typeof console.log>).mockClear();
  }
  if (jest.isMockFunction(console.error)) {
    (console.error as jest.MockedFunction<typeof console.error>).mockClear();
  }
  if (jest.isMockFunction(console.warn)) {
    (console.warn as jest.MockedFunction<typeof console.warn>).mockClear();
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create delayed promises for testing async behavior
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to capture console output
  captureConsole: () => {
    const logs: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = jest.fn((...args) => {
      logs.push(args.join(' '));
    });
    
    console.error = jest.fn((...args) => {
      errors.push(args.join(' '));
    });
    
    console.warn = jest.fn((...args) => {
      warnings.push(args.join(' '));
    });
    
    return {
      logs,
      errors, 
      warnings,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  },

  // Helper to mock file system operations
  mockFileSystem: () => {
    const files = new Map<string, string>();
    
    return {
      files,
      mockReadFile: (path: string, content: string) => {
        files.set(path, content);
      },
      mockFileExists: (path: string, exists: boolean) => {
        if (exists && !files.has(path)) {
          files.set(path, 'mock content');
        } else if (!exists) {
          files.delete(path);
        }
      },
      getFileContent: (path: string) => files.get(path),
      hasFile: (path: string) => files.has(path)
    };
  },

  // Helper to mock process execution
  mockExecution: () => {
    const executions: Array<{
      command: string;
      options?: any;
      result?: { stdout: string; stderr: string };
      error?: Error;
    }> = [];

    return {
      executions,
      mockCommand: (
        command: string, 
        result: { stdout: string; stderr: string } | Error
      ) => {
        const execution = { command, result: undefined as any, error: undefined as any };
        
        if (result instanceof Error) {
          execution.error = result;
        } else {
          execution.result = result;
        }
        
        executions.push(execution);
      },
      getExecutions: () => executions,
      getLastExecution: () => executions[executions.length - 1],
      clearExecutions: () => executions.splice(0)
    };
  }
};

// Increase timeout for integration tests
if (process.env.TEST_INTEGRATION === 'true') {
  jest.setTimeout(30000);
}

// Mock timers for tests that need them
beforeEach(() => {
  // Don't use fake timers by default, but make them available
  if (process.env.USE_FAKE_TIMERS === 'true') {
    jest.useFakeTimers();
  }
});

afterEach(() => {
  if (process.env.USE_FAKE_TIMERS === 'true') {
    jest.useRealTimers();
  }
});

// Global error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, but log the error
});

// Add custom matchers for testing
expect.extend({
  toBeValidFeatureName(received: string) {
    const isValid = /^[a-z0-9-]+$/.test(received) && 
                   received.length >= 2 && 
                   received.length <= 50;
    
    return {
      pass: isValid,
      message: () => 
        `expected ${received} to be a valid feature name (kebab-case, 2-50 characters)`
    };
  },

  toContainVariables(received: string, variables: string[]) {
    const missingVariables = variables.filter(
      variable => !received.includes(`$${variable}`)
    );
    
    return {
      pass: missingVariables.length === 0,
      message: () => 
        `expected template to contain variables: ${missingVariables.join(', ')}`
    };
  },

  toHaveBeenExecutedInDirectory(received: jest.MockedFunction<any>, directory: string) {
    const calls = received.mock.calls;
    const hasDirectoryCall = calls.some((call: any[]) => {
      const options = call[1];
      return options && options.cwd === directory;
    });

    return {
      pass: hasDirectoryCall,
      message: () => 
        `expected function to have been called with cwd: ${directory}`
    };
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidFeatureName(): R;
      toContainVariables(variables: string[]): R;
      toHaveBeenExecutedInDirectory(directory: string): R;
    }
  }
  
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    captureConsole: () => {
      logs: string[];
      errors: string[];
      warnings: string[];
      restore: () => void;
    };
    mockFileSystem: () => any;
    mockExecution: () => any;
  };
}