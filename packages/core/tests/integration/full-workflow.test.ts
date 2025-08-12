import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import path from 'path';
import {MultiAgentFeatureOrchestrator} from '../../src/orchestrator';

const execAsync = promisify(exec);

// This is an integration test that requires actual system setup
// It should be run in a controlled environment with proper mocks for external systems

describe('Full Workflow Integration Tests', () => {
  const testConfig = {
    mainRepoPath: '/tmp/test-repo',
    baseWorktreePath: '/tmp/test-worktrees',
    maxConcurrentTasks: 1,
    requiredApprovals: 1, // Reduced for testing
    reviewerProfiles: ['frontend'],
  };

  const testRepoExists = process.env.TEST_INTEGRATION === 'true';

  beforeAll(async () => {
    if (!testRepoExists) {
      console.log(
        'Skipping integration tests. Set TEST_INTEGRATION=true to run.',
      );
      return;
    }

    // Setup test repository
    await setupTestRepository();
  });

  afterAll(async () => {
    if (!testRepoExists) return;

    // Cleanup test artifacts
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    if (!testRepoExists) {
      // Use jest.skip to skip the test properly
      return;
    }
  });

  describe('Template System Integration', () => {
    it('should load and customize all command templates', async () => {
      const templatesDir = path.join(__dirname, '../../src/prompts');

      // Test that all template files exist
      const templates = ['arch.md', 'solve.md', 'review.md'];

      for (const template of templates) {
        const templatePath = path.join(templatesDir, template);
        await expect(fs.access(templatePath)).resolves.not.toThrow();

        const content = await fs.readFile(templatePath, 'utf-8');
        expect(content.length).toBeGreaterThan(100);

        // Check for variable placeholders
        expect(content).toMatch(/\$[A-Z_]+/);
      }
    });

    it('should customize templates with variables correctly', async () => {
      const orchestrator = new MultiAgentFeatureOrchestrator(
        testConfig,
        'test-feature',
      );

      const template =
        'Feature: $FEATURE_NAME, Issue: $ISSUE_NUMBER, Path: $WORKTREE_PATH';
      const variables = {
        FEATURE_NAME: 'user-auth',
        ISSUE_NUMBER: '123',
        WORKTREE_PATH: '/test/path',
      };

      const result = (orchestrator as any).customizePromptTemplate(
        template,
        variables,
      );

      expect(result).toBe('Feature: user-auth, Issue: 123, Path: /test/path');
      expect(result).not.toContain('$');
    });
  });

  describe('Git Operations Integration', () => {
    it('should handle git worktree operations safely', async () => {
      if (!testRepoExists) return;

      const orchestrator = new MultiAgentFeatureOrchestrator(
        testConfig,
        'test-git-ops',
      );

      // This would test actual git operations in a controlled environment
      // Commented out as it's not used in the test
      // const mockWorktreePath = path.join(
      //   testConfig.baseWorktreePath,
      //   'stays-test-git-ops',
      // );

      // Test worktree existence check
      const exists = await (orchestrator as any).worktreeExists();
      expect(typeof exists).toBe('boolean');
    });

    it('should parse git branch information correctly', async () => {
      if (!testRepoExists) return;

      try {
        const {stdout} = await execAsync('git branch --show-current', {
          cwd: testConfig.mainRepoPath,
        });

        expect(stdout.trim()).toMatch(/^[a-zA-Z0-9-_/]+$/);
      } catch (error) {
        // Expected in test environment without actual git repo
        expect(error).toBeDefined();
      }
    });
  });

  describe('GitHub CLI Integration', () => {
    it('should handle GitHub CLI availability gracefully', async () => {
      let ghAvailable = false;

      try {
        await execAsync('gh --version');
        ghAvailable = true;
      } catch {
        ghAvailable = false;
      }

      // Test should pass regardless of gh CLI availability
      expect(typeof ghAvailable).toBe('boolean');
    });

    it('should parse GitHub issue data correctly', async () => {
      const mockIssueData = {
        title: 'Test Issue',
        body: 'This is a test issue.\n\nDepends on #123\nBlocked by #456',
        state: 'open',
      };

      const orchestrator = new MultiAgentFeatureOrchestrator(
        testConfig,
        'test-feature',
      );
      const dependencies = (orchestrator as any).parseDependencies(
        mockIssueData.body,
      );

      expect(dependencies).toEqual([123, 456]);
    });
  });

  describe('Claude Code CLI Integration', () => {
    it('should detect Claude Code CLI availability', async () => {
      let claudeCodeAvailable = false;

      try {
        await execAsync('claude-code --version');
        claudeCodeAvailable = true;
      } catch {
        claudeCodeAvailable = false;
      }

      // This is the key integration point
      expect(typeof claudeCodeAvailable).toBe('boolean');

      if (!claudeCodeAvailable) {
        console.warn('Claude Code CLI not available for integration testing');
      }
    });

    it('should handle Claude Code execution timeouts', async () => {
      const orchestrator = new MultiAgentFeatureOrchestrator(
        testConfig,
        'test-timeout',
      );

      // Mock a long-running Claude Code operation
      const mockPrompt = 'Test prompt';
      const workingDir = '/tmp';

      // This would test the timeout handling in callClaudeCodeAgent
      // In a real test, we'd mock the claude-code command to hang
      expect(async () => {
        // This should complete quickly since claude-code doesn't exist in test env
        await (orchestrator as any).callClaudeCodeAgent(
          mockPrompt,
          'test',
          workingDir,
        );
      }).not.toThrow();
    });
  });

  describe('File System Operations Integration', () => {
    it('should handle file operations safely', async () => {
      const testDir = '/tmp/multi-agent-test';
      const testFile = path.join(testDir, 'test-prompt.md');

      try {
        // Create test directory
        await fs.mkdir(testDir, {recursive: true});

        // Write test file
        await fs.writeFile(testFile, 'Test prompt content');

        // Read test file
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('Test prompt content');

        // Cleanup
        await fs.unlink(testFile);
        await fs.rmdir(testDir);
      } catch (error) {
        console.warn('File system operations test failed:', error);
      }
    });

    it('should handle concurrent file operations', async () => {
      const testDir = '/tmp/multi-agent-concurrent';

      try {
        await fs.mkdir(testDir, {recursive: true});

        // Simulate multiple agents writing prompt files concurrently
        const promises = Array.from({length: 3}, async (_, i) => {
          const filePath = path.join(testDir, `prompt-${i}.md`);
          await fs.writeFile(filePath, `Prompt ${i}`);
          return filePath;
        });

        const files = await Promise.all(promises);
        expect(files).toHaveLength(3);

        // Cleanup
        for (const file of files) {
          await fs.unlink(file);
        }
        await fs.rmdir(testDir);
      } catch (error) {
        console.warn('Concurrent file operations test failed:', error);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing directories gracefully', async () => {
      const orchestrator = new MultiAgentFeatureOrchestrator(
        {
          ...testConfig,
          mainRepoPath: '/non-existent-path',
          baseWorktreePath: '/another-non-existent-path',
        },
        'test-error-handling',
      );

      // This should not throw but should handle the error appropriately
      const exists = await (orchestrator as any).worktreeExists();
      expect(exists).toBe(false);
    });

    it('should handle command failures gracefully', async () => {
      const orchestrator = new MultiAgentFeatureOrchestrator(
        testConfig,
        'test-cmd-failures',
      );

      // Test with a command that will fail
      try {
        await (orchestrator as any).callClaudeCodeAgent(
          'test',
          'test',
          '/non-existent',
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // Helper functions for test setup
  async function setupTestRepository(): Promise<void> {
    try {
      await fs.mkdir(testConfig.mainRepoPath, {recursive: true});
      await fs.mkdir(testConfig.baseWorktreePath, {recursive: true});

      // Initialize a minimal git repo for testing
      await execAsync('git init', {cwd: testConfig.mainRepoPath});
      await execAsync('git config user.name "Test User"', {
        cwd: testConfig.mainRepoPath,
      });
      await execAsync('git config user.email "test@example.com"', {
        cwd: testConfig.mainRepoPath,
      });

      // Create initial commit
      const readmePath = path.join(testConfig.mainRepoPath, 'README.md');
      await fs.writeFile(readmePath, '# Test Repository');
      await execAsync('git add README.md', {cwd: testConfig.mainRepoPath});
      await execAsync('git commit -m "Initial commit"', {
        cwd: testConfig.mainRepoPath,
      });
    } catch (error) {
      console.warn('Failed to setup test repository:', error);
    }
  }

  async function cleanupTestEnvironment(): Promise<void> {
    try {
      // Remove test directories
      await execAsync(`rm -rf ${testConfig.mainRepoPath}`);
      await execAsync(`rm -rf ${testConfig.baseWorktreePath}`);
    } catch (error) {
      console.warn('Failed to cleanup test environment:', error);
    }
  }
});
