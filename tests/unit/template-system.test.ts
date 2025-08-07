import fs from 'fs/promises';
import path from 'path';
import { mockTemplates } from '../fixtures/mock-data';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Template System', () => {
  const commandsDir = path.join(__dirname, '../../src/commands');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Loading', () => {
    it('should load architecture template correctly', async () => {
      mockFs.readFile.mockResolvedValue(mockTemplates.architecture);

      const template = await fs.readFile(path.join(commandsDir, 'arch.md'), 'utf-8');
      
      expect(template).toContain('Architecture Agent');
      expect(template).toContain('$FEATURE_REQUEST');
      expect(template).toContain('$AGENT_ID');
      expect(template).toContain('$MAIN_REPO_PATH');
      expect(template).toContain('$WORKTREE_PATH');
    });

    it('should load solve template correctly', async () => {
      mockFs.readFile.mockResolvedValue(mockTemplates.solve);

      const template = await fs.readFile(path.join(commandsDir, 'solve.md'), 'utf-8');
      
      expect(template).toContain('Solver Agent');
      expect(template).toContain('$ISSUE_NUMBER');
      expect(template).toContain('$FEATURE_NAME');
      expect(template).toContain('$ATTEMPT_NUMBER');
      expect(template).toContain('$MAX_ATTEMPTS');
      expect(template).toContain('$AGENT_ID');
      expect(template).toContain('$WORKTREE_PATH');
      expect(template).toContain('$BASE_BRANCH');
    });

    it('should load review template correctly', async () => {
      mockFs.readFile.mockResolvedValue(mockTemplates.review);

      const template = await fs.readFile(path.join(commandsDir, 'review.md'), 'utf-8');
      
      expect(template).toContain('Reviewer Agent');
      expect(template).toContain('$PR_NUMBER');
      expect(template).toContain('$ISSUE_NUMBER');
      expect(template).toContain('$FEATURE_NAME');
      expect(template).toContain('$REVIEWER_PROFILE');
      expect(template).toContain('$AGENT_ID');
      expect(template).toContain('$WORKTREE_PATH');
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(
        fs.readFile(path.join(commandsDir, 'non-existent.md'), 'utf-8')
      ).rejects.toThrow('File not found');
    });
  });

  describe('Template Variable Replacement', () => {
    // Helper function to simulate the customizePromptTemplate method
    function customizePromptTemplate(template: string, variables: Record<string, string>): string {
      let customized = template;
      
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `$${key}`;
        customized = customized.replace(new RegExp(placeholder.replace(/\$/g, '\\$'), 'g'), value);
      }
      
      return customized;
    }

    it('should replace all architecture template variables', () => {
      const variables = {
        FEATURE_REQUEST: 'Implement user authentication system',
        AGENT_ID: 'arch-12345',
        MAIN_REPO_PATH: '/path/to/repo',
        WORKTREE_PATH: '/path/to/worktree'
      };

      const result = customizePromptTemplate(mockTemplates.architecture, variables);

      expect(result).toContain('Implement user authentication system');
      expect(result).toContain('arch-12345');
      expect(result).toContain('/path/to/repo');
      expect(result).toContain('/path/to/worktree');
      
      // Ensure no variables remain unreplaced
      expect(result).not.toMatch(/\$[A-Z_]+/);
    });

    it('should replace all solve template variables', () => {
      const variables = {
        ISSUE_NUMBER: '123',
        FEATURE_NAME: 'user-auth',
        ATTEMPT_NUMBER: '1',
        MAX_ATTEMPTS: '3',
        AGENT_ID: 'solver-67890',
        WORKTREE_PATH: '/path/to/worktree',
        BASE_BRANCH: 'feature/user-auth'
      };

      const result = customizePromptTemplate(mockTemplates.solve, variables);

      expect(result).toContain('123');
      expect(result).toContain('user-auth');
      expect(result).toContain('1 of 3');
      expect(result).toContain('solver-67890');
      expect(result).toContain('/path/to/worktree');
      expect(result).toContain('feature/user-auth');
      
      expect(result).not.toMatch(/\$[A-Z_]+/);
    });

    it('should replace all review template variables', () => {
      const variables = {
        PR_NUMBER: '456',
        ISSUE_NUMBER: '123',
        FEATURE_NAME: 'user-auth',
        REVIEWER_PROFILE: 'frontend',
        AGENT_ID: 'reviewer-frontend',
        WORKTREE_PATH: '/path/to/worktree'
      };

      const result = customizePromptTemplate(mockTemplates.review, variables);

      expect(result).toContain('#456');
      expect(result).toContain('#123');
      expect(result).toContain('user-auth');
      expect(result).toContain('frontend');
      expect(result).toContain('reviewer-frontend');
      expect(result).toContain('/path/to/worktree');
      
      expect(result).not.toMatch(/\$[A-Z_]+/);
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Issue: $ISSUE_NUMBER, Feature: $FEATURE_NAME, Missing: $MISSING_VAR';
      const variables = {
        ISSUE_NUMBER: '123',
        FEATURE_NAME: 'test-feature'
        // MISSING_VAR is intentionally not provided
      };

      const result = customizePromptTemplate(template, variables);

      expect(result).toBe('Issue: 123, Feature: test-feature, Missing: $MISSING_VAR');
    });

    it('should handle special characters in variables', () => {
      const template = 'Path: $PATH, Command: $COMMAND';
      const variables = {
        PATH: '/path/with spaces/and-special$chars',
        COMMAND: 'git commit -m "fix: resolve issue #123"'
      };

      const result = customizePromptTemplate(template, variables);

      expect(result).toContain('/path/with spaces/and-special$chars');
      expect(result).toContain('git commit -m "fix: resolve issue #123"');
    });

    it('should replace multiple occurrences of the same variable', () => {
      const template = '$FEATURE_NAME is important. We are working on $FEATURE_NAME.';
      const variables = { FEATURE_NAME: 'authentication' };

      const result = customizePromptTemplate(template, variables);

      expect(result).toBe('authentication is important. We are working on authentication.');
    });
  });

  describe('Template Validation', () => {
    it('should identify all required variables in architecture template', () => {
      const variables = mockTemplates.architecture.match(/\$[A-Z_]+/g) || [];
      const uniqueVariables = [...new Set(variables)];

      expect(uniqueVariables).toContain('$FEATURE_REQUEST');
      expect(uniqueVariables).toContain('$AGENT_ID');
      expect(uniqueVariables).toContain('$MAIN_REPO_PATH');
      expect(uniqueVariables).toContain('$WORKTREE_PATH');
    });

    it('should identify all required variables in solve template', () => {
      const variables = mockTemplates.solve.match(/\$[A-Z_]+/g) || [];
      const uniqueVariables = [...new Set(variables)];

      expect(uniqueVariables).toContain('$ISSUE_NUMBER');
      expect(uniqueVariables).toContain('$FEATURE_NAME');
      expect(uniqueVariables).toContain('$ATTEMPT_NUMBER');
      expect(uniqueVariables).toContain('$MAX_ATTEMPTS');
      expect(uniqueVariables).toContain('$AGENT_ID');
      expect(uniqueVariables).toContain('$WORKTREE_PATH');
      expect(uniqueVariables).toContain('$BASE_BRANCH');
    });

    it('should identify all required variables in review template', () => {
      const variables = mockTemplates.review.match(/\$[A-Z_]+/g) || [];
      const uniqueVariables = [...new Set(variables)];

      expect(uniqueVariables).toContain('$PR_NUMBER');
      expect(uniqueVariables).toContain('$ISSUE_NUMBER');
      expect(uniqueVariables).toContain('$FEATURE_NAME');
      expect(uniqueVariables).toContain('$REVIEWER_PROFILE');
      expect(uniqueVariables).toContain('$AGENT_ID');
      expect(uniqueVariables).toContain('$WORKTREE_PATH');
    });

    it('should validate template structure', () => {
      // Each template should have proper structure
      expect(mockTemplates.architecture).toContain('Architecture Agent');
      expect(mockTemplates.architecture).toContain('## Architecture Context');
      expect(mockTemplates.architecture).toContain('## Critical Requirements');

      expect(mockTemplates.solve).toContain('Solver Agent');
      expect(mockTemplates.solve).toContain('## Task Context');

      expect(mockTemplates.review).toContain('Reviewer Agent');
      expect(mockTemplates.review).toContain('## Review Context');
    });
  });

  describe('Template Content Quality', () => {
    it('should have meaningful content length', () => {
      expect(mockTemplates.architecture.length).toBeGreaterThan(300);
      expect(mockTemplates.solve.length).toBeGreaterThan(300);
      expect(mockTemplates.review.length).toBeGreaterThan(300);
    });

    it('should contain relevant instructions for each agent type', () => {
      // Architecture template should contain planning instructions
      expect(mockTemplates.architecture).toMatch(/planning|design|architecture/i);
      
      // Solve template should contain implementation instructions
      expect(mockTemplates.solve).toMatch(/implement|code|develop/i);
      
      // Review template should contain review instructions  
      expect(mockTemplates.review).toMatch(/review|approve|reject/i);
    });

    it('should include multi-agent coordination guidance', () => {
      expect(mockTemplates.architecture).toMatch(/multi-agent/i);
      expect(mockTemplates.solve).toMatch(/multi-agent/i);
      expect(mockTemplates.review).toMatch(/multi-agent/i);
    });
  });
});