import { exec } from 'child_process';
import { promisify } from 'util';

// Mock external dependencies
jest.mock('child_process');
jest.mock('util');
jest.mock('../../src/orchestrator');

const mockExec = exec as jest.MockedFunction<typeof exec>;

// Mock the orchestrator module
const mockExecuteFeature = jest.fn();
jest.mock('../../src/orchestrator', () => ({
  MultiAgentFeatureOrchestrator: jest.fn().mockImplementation(() => ({
    executeFeature: mockExecuteFeature
  }))
}));

describe('run-feature.ts', () => {
  let mockExecAsync: jest.MockedFunction<(...args: any[]) => Promise<{stdout: string, stderr: string}>>;
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let mockExit: jest.MockedFunction<typeof process.exit>;

  beforeEach(() => {
    // Setup exec mock
    mockExecAsync = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<{stdout: string, stderr: string}>>;
    (promisify as unknown as jest.Mock).mockReturnValue(mockExecAsync);

    // Save original process.argv and process.exit
    originalArgv = process.argv;
    originalExit = process.exit;
    
    // Mock process.exit
    mockExit = jest.fn() as unknown as jest.MockedFunction<typeof process.exit>;
    process.exit = mockExit;

    // Reset mocks
    jest.clearAllMocks();
    mockExecuteFeature.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  describe('Command Line Argument Parsing', () => {
    it('should handle architecture mode correctly', async () => {
      // Mock Claude Code availability
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });

      process.argv = [
        'node',
        'run-feature.ts',
        'user-auth',
        'Implement user authentication with JWT',
        '--arch'
      ];

      // Import and run the main function
      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecuteFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user-auth',
          description: 'Implement user authentication with JWT',
          architectureMode: true,
          isParentFeature: true,
          issues: undefined
        })
      );
    });

    it('should handle issue mode correctly', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });

      process.argv = [
        'node',
        'run-feature.ts',
        'payment-system',
        '123',
        '124',
        '125'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecuteFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'payment-system',
          issues: [123, 124, 125],
          architectureMode: false,
          isParentFeature: false
        })
      );
    });

    it('should handle parent feature flag', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });

      process.argv = [
        'node',
        'run-feature.ts',
        'new-feature',
        '456',
        '789',
        '--parent-feature'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecuteFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'new-feature',
          issues: [456, 789],
          isParentFeature: true
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should exit with error for insufficient arguments', async () => {
      process.argv = ['node', 'run-feature.ts'];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit with error when Claude Code is not available', async () => {
      // Clear previous mocks and set up failure
      mockExecAsync.mockReset();
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      process.argv = [
        'node',
        'run-feature.ts',
        'test-feature',
        'Test description',
        '--arch'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit with error for no valid issue numbers in issue mode', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });

      process.argv = [
        'node',
        'run-feature.ts',
        'test-feature',
        'invalid',
        'arguments'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Claude Code Validation', () => {
    it('should validate Claude Code availability before proceeding', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });

      process.argv = [
        'node',
        'run-feature.ts',
        'test-feature',
        'Test description',
        '--arch'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecAsync).toHaveBeenCalledWith('claude-code --version');
    });

    it('should provide helpful error message when Claude Code is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      process.argv = [
        'node',
        'run-feature.ts',
        'test-feature',
        'Test description',
        '--arch'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude Code CLI not found')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://claude.ai/code')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Feature Specification Creation', () => {
    beforeEach(() => {
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });
    });

    it('should create correct spec for architecture mode', async () => {
      process.argv = [
        'node',
        'run-feature.ts',
        'user-dashboard',
        'Create comprehensive user dashboard',
        '--arch'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecuteFeature).toHaveBeenCalledWith({
        name: 'user-dashboard',
        description: 'Create comprehensive user dashboard',
        baseBranch: 'dev',
        issues: undefined,
        isParentFeature: true,
        architectureMode: true
      });
    });

    it('should create correct spec for issue mode with existing feature', async () => {
      process.argv = [
        'node',
        'run-feature.ts',
        'existing-feature',
        '100',
        '101',
        '102'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecuteFeature).toHaveBeenCalledWith({
        name: 'existing-feature',
        description: 'Implementation of issues: 100, 101, 102',
        baseBranch: 'feature/existing-feature',
        issues: [100, 101, 102],
        isParentFeature: false,
        architectureMode: false
      });
    });

    it('should handle mixed valid and invalid issue numbers', async () => {
      process.argv = [
        'node',
        'run-feature.ts',
        'test-feature',
        '123',
        'invalid',
        '456',
        'also-invalid',
        '789'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(mockExecuteFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: [123, 456, 789]
        })
      );
    });
  });

  describe('Success and Failure Handling', () => {
    beforeEach(() => {
      mockExecAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' });
    });

    it('should handle successful feature execution', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockExecuteFeature.mockResolvedValue(undefined);

      process.argv = [
        'node',
        'run-feature.ts',
        'success-feature',
        'Test successful execution',
        '--arch'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(consoleSpy).toHaveBeenCalledWith('🎉 Feature development completed successfully!');
      expect(mockExit).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle feature execution failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Feature execution failed');
      mockExecuteFeature.mockRejectedValue(testError);

      process.argv = [
        'node',
        'run-feature.ts',
        'failing-feature',
        'Test failure handling',
        '--arch'
      ];

      const { main } = await import('../../src/run-feature');
      await main();

      expect(consoleSpy).toHaveBeenCalledWith('💥 Feature development failed:', testError);
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
    });
  });
});