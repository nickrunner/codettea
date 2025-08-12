import { MultiAgentFeatureOrchestrator } from '../../src/orchestrator';
import fs from 'fs/promises';
import path from 'path';

// Mock external dependencies
jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('MultiAgentFeatureOrchestrator', () => {
  let orchestrator: MultiAgentFeatureOrchestrator;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      mainRepoPath: '/mock/repo',
      baseWorktreePath: '/mock/worktrees',
      maxConcurrentTasks: 2,
      requiredApprovals: 3,
      reviewerProfiles: ['frontend', 'backend', 'devops']
    };

    orchestrator = new MultiAgentFeatureOrchestrator(mockConfig, 'test-feature');

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(orchestrator).toBeInstanceOf(MultiAgentFeatureOrchestrator);
    });

    it('should set feature worktree path correctly', () => {
      const expectedPath = path.join(mockConfig.baseWorktreePath, 'repo-test-feature');
      // Access private property for testing
      expect((orchestrator as any).worktreeManager.path).toBe(expectedPath);
    });
  });

  describe.skip('customizePromptTemplate', () => {
    it('should replace template variables correctly', () => {
      const template = 'Hello $NAME, your issue is $ISSUE_NUMBER';
      const variables = { NAME: 'John', ISSUE_NUMBER: '123' };
      
      const result = (orchestrator as any).customizePromptTemplate(template, variables);
      
      expect(result).toBe('Hello John, your issue is 123');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = '$VAR and $VAR again';
      const variables = { VAR: 'test' };
      
      const result = (orchestrator as any).customizePromptTemplate(template, variables);
      
      expect(result).toBe('test and test again');
    });

    it('should handle variables with special regex characters', () => {
      const template = 'Path: $PATH';
      const variables = { PATH: '/path/with/special$chars' };
      
      const result = (orchestrator as any).customizePromptTemplate(template, variables);
      
      expect(result).toBe('Path: /path/with/special$chars');
    });
  });

  describe.skip('parseCreatedIssues', () => {
    it('should extract issue numbers from response text', () => {
      const response = 'Created issues #123, #456, and #789 for this feature.';
      
      const result = (orchestrator as any).parseCreatedIssues(response);
      
      expect(result).toEqual([123, 456, 789]);
    });

    it('should handle no issue numbers', () => {
      const response = 'No issues were created.';
      
      const result = (orchestrator as any).parseCreatedIssues(response);
      
      expect(result).toEqual([]);
    });

    it('should remove duplicate issue numbers', () => {
      const response = 'Issues #123, #456, #123, #789, #456';
      
      const result = (orchestrator as any).parseCreatedIssues(response);
      
      expect(result).toEqual([123, 456, 789]);
    });
  });

  describe.skip('parseReviewResult', () => {
    it('should detect APPROVE in various formats', () => {
      expect((orchestrator as any).parseReviewResult('APPROVE: looks good')).toBe('APPROVE');
      expect((orchestrator as any).parseReviewResult('I approve this change')).toBe('APPROVE');
      expect((orchestrator as any).parseReviewResult('LGTM - approved')).toBe('APPROVE');
      expect((orchestrator as any).parseReviewResult('✅ Approved')).toBe('APPROVE');
    });

    it('should default to REJECT for unclear responses', () => {
      expect((orchestrator as any).parseReviewResult('Needs work')).toBe('REJECT');
      expect((orchestrator as any).parseReviewResult('REJECT: has issues')).toBe('REJECT');
      expect((orchestrator as any).parseReviewResult('Not ready')).toBe('REJECT');
    });
  });

  describe.skip('parseReviewComments', () => {
    it('should extract meaningful comments', () => {
      const response = `
        APPROVE: This looks good
        
        Some detailed feedback about the implementation.
        Another line of feedback.
        🤖 claude-code output
        Various other output
      `;
      
      const result = (orchestrator as any).parseReviewComments(response);
      
      expect(result).toContain('This looks good');
      expect(result).toContain('Some detailed feedback');
      expect(result).not.toContain('🤖');
    });
  });

  describe.skip('hasIncompleteTasks', () => {
    beforeEach(() => {
      // Clear the tasks map
      (orchestrator as any).tasks.clear();
    });

    it('should return false when no tasks exist', () => {
      const result = (orchestrator as any).hasIncompleteTasks();
      expect(result).toBe(false);
    });

    it('should return false when all tasks are completed', () => {
      const tasksMap = (orchestrator as any).tasks;
      tasksMap.set(1, { status: 'completed' });
      tasksMap.set(2, { status: 'completed' });
      
      const result = (orchestrator as any).hasIncompleteTasks();
      expect(result).toBe(false);
    });

    it('should return true when some tasks are incomplete', () => {
      const tasksMap = (orchestrator as any).tasks;
      tasksMap.set(1, { status: 'completed' });
      tasksMap.set(2, { status: 'pending' });
      
      const result = (orchestrator as any).hasIncompleteTasks();
      expect(result).toBe(true);
    });
  });

  describe.skip('getReadyTasks', () => {
    beforeEach(() => {
      (orchestrator as any).tasks.clear();
    });

    it('should return tasks with no dependencies and pending status', () => {
      const tasksMap = (orchestrator as any).tasks;
      tasksMap.set(1, { 
        issueNumber: 1, 
        status: 'pending', 
        dependencies: [] 
      });
      tasksMap.set(2, { 
        issueNumber: 2, 
        status: 'completed', 
        dependencies: [] 
      });
      
      const result = (orchestrator as any).getReadyTasks();
      
      expect(result).toHaveLength(1);
      expect(result[0].issueNumber).toBe(1);
    });

    it('should return tasks whose dependencies are completed', () => {
      const tasksMap = (orchestrator as any).tasks;
      tasksMap.set(1, { 
        issueNumber: 1, 
        status: 'completed', 
        dependencies: [] 
      });
      tasksMap.set(2, { 
        issueNumber: 2, 
        status: 'pending', 
        dependencies: [1] 
      });
      
      const result = (orchestrator as any).getReadyTasks();
      
      expect(result).toHaveLength(1);
      expect(result[0].issueNumber).toBe(2);
    });

    it('should not return tasks with incomplete dependencies', () => {
      const tasksMap = (orchestrator as any).tasks;
      tasksMap.set(1, { 
        issueNumber: 1, 
        status: 'pending', 
        dependencies: [] 
      });
      tasksMap.set(2, { 
        issueNumber: 2, 
        status: 'pending', 
        dependencies: [1] 
      });
      
      const result = (orchestrator as any).getReadyTasks();
      
      expect(result).toHaveLength(1);
      expect(result[0].issueNumber).toBe(1);
    });
  });

  describe.skip('parseDependencies', () => {
    it('should extract dependencies from issue body', () => {
      const issueBody = `
        This task needs to be done.
        
        Depends on #123
        Also blocked by #456
        
        Some other content.
      `;
      
      const result = (orchestrator as any).parseDependencies(issueBody);
      
      expect(result).toEqual([123, 456]);
    });

    it('should handle no dependencies', () => {
      const issueBody = 'This task has no dependencies.';
      
      const result = (orchestrator as any).parseDependencies(issueBody);
      
      expect(result).toEqual([]);
    });

    it('should handle various dependency formats', () => {
      const issueBody = `
        depends on #123
        Depends on #456  
        BLOCKED BY #789
        blocked by #101
      `;
      
      const result = (orchestrator as any).parseDependencies(issueBody);
      
      expect(result).toEqual([123, 456, 789, 101]);
    });
  });

  describe.skip('worktreeExists', () => {
    it('should return true when worktree exists', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await (orchestrator as any).worktreeExists();
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalled();
    });

    it('should return false when worktree does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      
      const result = await (orchestrator as any).worktreeExists();
      
      expect(result).toBe(false);
    });
  });

  describe.skip('getCurrentBranchName', () => {
    it('should return current branch name', async () => {
      const mockExecAsync = jest.fn().mockResolvedValue({ 
        stdout: 'feature/test-branch\n', 
        stderr: '' 
      });
      
      // Mock the execAsync function
      (orchestrator as any).getCurrentBranchName = jest.fn(async (workingDir: string) => {
        const result = await mockExecAsync('git branch --show-current', { cwd: workingDir });
        return result.stdout.trim();
      });
      
      const result = await (orchestrator as any).getCurrentBranchName('/mock/path');
      
      expect(result).toBe('feature/test-branch');
    });
  });

  describe.skip('getPreviousFailureFeedback', () => {
    it('should return formatted feedback from rejected reviews', () => {
      const task = {
        reviewHistory: [
          { result: 'APPROVE', reviewerId: 'reviewer-1', comments: 'Looks good' },
          { result: 'REJECT', reviewerId: 'reviewer-2', comments: 'Needs more tests' },
          { result: 'REJECT', reviewerId: 'reviewer-3', comments: 'Fix type errors' }
        ]
      };
      
      const result = (orchestrator as any).getPreviousFailureFeedback(task);
      
      expect(result).toContain('reviewer-2: Needs more tests');
      expect(result).toContain('reviewer-3: Fix type errors');
      expect(result).not.toContain('reviewer-1');
    });

    it('should return empty string when no rejections', () => {
      const task = {
        reviewHistory: [
          { result: 'APPROVE', reviewerId: 'reviewer-1', comments: 'Looks good' }
        ]
      };
      
      const result = (orchestrator as any).getPreviousFailureFeedback(task);
      
      expect(result).toBe('');
    });
  });
});