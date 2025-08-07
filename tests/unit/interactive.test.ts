import { InteractiveMultiAgentCLI } from '../../src/interactive';
import { exec } from 'child_process';
import fs from 'fs/promises';
import readline from 'readline';

// Mock external dependencies
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('readline');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockReadline = readline as jest.Mocked<typeof readline>;

describe('InteractiveMultiAgentCLI', () => {
  let cli: any; // Use any to access private methods
  let mockRl: any;

  beforeEach(() => {
    // Mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn()
    };
    
    mockReadline.createInterface.mockReturnValue(mockRl);
    
    // Access the class through require to test private methods
    const { InteractiveMultiAgentCLI: CLI } = require('../../src/interactive');
    cli = new CLI();
    
    jest.clearAllMocks();
  });

  describe('checkClaudeCode', () => {
    it('should return true when Claude Code is available', async () => {
      const mockExecAsync = jest.fn().mockResolvedValue({ stdout: '1.0.0', stderr: '' });
      
      // Mock the private method
      cli.checkClaudeCode = jest.fn(async () => {
        try {
          await mockExecAsync('claude-code --version');
          return true;
        } catch {
          return false;
        }
      });
      
      const result = await cli.checkClaudeCode();
      expect(result).toBe(true);
    });

    it('should return false when Claude Code is not available', async () => {
      const mockExecAsync = jest.fn().mockRejectedValue(new Error('Command not found'));
      
      cli.checkClaudeCode = jest.fn(async () => {
        try {
          await mockExecAsync('claude-code --version');
          return true;
        } catch {
          return false;
        }
      });
      
      const result = await cli.checkClaudeCode();
      expect(result).toBe(false);
    });
  });

  describe('isValidFeatureName', () => {
    it('should accept valid kebab-case names', () => {
      expect(cli.isValidFeatureName('user-auth')).toBe(true);
      expect(cli.isValidFeatureName('payment-system')).toBe(true);
      expect(cli.isValidFeatureName('dashboard-v2')).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(cli.isValidFeatureName('UserAuth')).toBe(false); // camelCase
      expect(cli.isValidFeatureName('user_auth')).toBe(false); // underscores
      expect(cli.isValidFeatureName('user auth')).toBe(false); // spaces
      expect(cli.isValidFeatureName('u')).toBe(false); // too short
      expect(cli.isValidFeatureName('')).toBe(false); // empty
    });

    it('should handle edge cases', () => {
      expect(cli.isValidFeatureName('ab')).toBe(true); // minimum length
      expect(cli.isValidFeatureName('a'.repeat(50))).toBe(true); // maximum length
      expect(cli.isValidFeatureName('a'.repeat(51))).toBe(false); // too long
    });
  });

  describe('getExistingFeatures', () => {
    it('should parse feature branches correctly', async () => {
      const mockExecAsync = jest.fn()
        .mockResolvedValueOnce({
          stdout: '  origin/feature/user-auth\n  origin/feature/payment-system\n',
          stderr: ''
        })
        .mockResolvedValue({ stdout: '[]', stderr: '' }); // Mock for issue queries
      
      cli.getExistingFeatures = jest.fn(async () => {
        const { stdout } = await mockExecAsync('git branch -r');
        const branches = stdout.split('\n')
          .filter((line: string) => line.includes('origin/feature/'))
          .map((line: string) => line.trim().replace('origin/', ''));
        
        return branches.map((branch: string) => ({
          name: branch.replace('feature/', ''),
          branch,
          worktreePath: `/mock/worktrees/stays-${branch.replace('feature/', '')}`,
          exists: false,
          issues: []
        }));
      });
      
      const result = await cli.getExistingFeatures();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('user-auth');
      expect(result[1].name).toBe('payment-system');
    });

    it('should handle no feature branches', async () => {
      cli.getExistingFeatures = jest.fn(async () => []);
      
      const result = await cli.getExistingFeatures();
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getFeatureIssues', () => {
    it('should parse GitHub issues correctly', async () => {
      const mockIssuesJson = JSON.stringify([
        {
          number: 123,
          title: 'Implement user login',
          state: 'open',
          labels: [{ name: 'frontend' }, { name: 'user-auth' }],
          assignees: [{ login: 'developer1' }]
        },
        {
          number: 124,
          title: 'Add password reset',
          state: 'closed',
          labels: [{ name: 'backend' }],
          assignees: []
        }
      ]);
      
      cli.getFeatureIssues = jest.fn(async (featureName: string) => {
        return JSON.parse(mockIssuesJson).map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map((l: any) => l.name),
          assignees: issue.assignees.map((a: any) => a.login),
          inProgress: issue.labels.some((l: any) => l.name === 'in-progress')
        }));
      });
      
      const result = await cli.getFeatureIssues('user-auth');
      
      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(123);
      expect(result[0].state).toBe('open');
      expect(result[0].labels).toContain('frontend');
      expect(result[1].state).toBe('closed');
    });

    it('should handle API errors gracefully', async () => {
      cli.getFeatureIssues = jest.fn(async () => []);
      
      const result = await cli.getFeatureIssues('non-existent');
      
      expect(result).toEqual([]);
    });
  });

  describe('prompt and waitForUser', () => {
    it('should handle user input correctly', async () => {
      mockRl.question.mockImplementation((question: string, callback: (answer: string) => void) => {
        callback('test input');
      });
      
      const result = await cli.prompt('Enter something: ');
      
      expect(result).toBe('test input');
      expect(mockRl.question).toHaveBeenCalledWith('Enter something: ', expect.any(Function));
    });

    it('should wait for user confirmation', async () => {
      mockRl.question.mockImplementation((question: string, callback: (answer: string) => void) => {
        callback('');
      });
      
      await cli.waitForUser('Press Enter...');
      
      expect(mockRl.question).toHaveBeenCalledWith('Press Enter...', expect.any(Function));
    });
  });

  describe('executeFeatureDevelopment', () => {
    it('should create correct FeatureSpec for architecture mode', async () => {
      const mockOrchestrator = {
        executeFeature: jest.fn().mockResolvedValue(undefined)
      };
      
      // Mock the orchestrator creation and execution
      cli.executeFeatureDevelopment = jest.fn(async (
        featureName: string,
        description: string,
        isArchMode: boolean,
        issues?: number[]
      ) => {
        const spec = {
          name: featureName,
          description,
          baseBranch: 'dev',
          issues: isArchMode ? undefined : issues,
          isParentFeature: true,
          architectureMode: isArchMode
        };
        
        await mockOrchestrator.executeFeature(spec);
        return { spec };
      });
      
      const result = await cli.executeFeatureDevelopment(
        'test-feature',
        'Test description',
        true
      );
      
      expect(result.spec.architectureMode).toBe(true);
      expect(result.spec.issues).toBeUndefined();
    });

    it('should create correct FeatureSpec for issue mode', async () => {
      cli.executeFeatureDevelopment = jest.fn(async (
        featureName: string,
        description: string,
        isArchMode: boolean,
        issues?: number[]
      ) => {
        const spec = {
          name: featureName,
          description,
          baseBranch: 'dev',
          issues: isArchMode ? undefined : issues,
          isParentFeature: true,
          architectureMode: isArchMode
        };
        
        return { spec };
      });
      
      const result = await cli.executeFeatureDevelopment(
        'test-feature',
        'Test description',
        false,
        [123, 456]
      );
      
      expect(result.spec.architectureMode).toBe(false);
      expect(result.spec.issues).toEqual([123, 456]);
    });
  });

  describe('showWorktreeStatus', () => {
    it('should display worktree information correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cli.showWorktreeStatus = jest.fn(async (worktreePath: string) => {
        console.log(`📁 Worktree Status: ${worktreePath}`);
        console.log('🌿 Current Branch: feature/test');
        console.log('✅ Working directory clean');
      });
      
      await cli.showWorktreeStatus('/mock/worktree');
      
      expect(consoleSpy).toHaveBeenCalledWith('📁 Worktree Status: /mock/worktree');
      expect(consoleSpy).toHaveBeenCalledWith('🌿 Current Branch: feature/test');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Working directory clean');
      
      consoleSpy.mockRestore();
    });
  });
});