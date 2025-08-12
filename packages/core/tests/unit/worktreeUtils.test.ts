const execAsync = jest.fn();

jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('../../src/utils/git');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(() => execAsync),
}));

import * as WorktreeUtils from '../../src/utils/worktreeManager';
import {GitUtils} from '../../src/utils/git';
import fs from 'fs/promises';

describe('Worktree Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    execAsync.mockClear();
  });

  describe('getWorktreeList', () => {
    it('should parse worktree list correctly', async () => {
      const mockOutput = `worktree /path/to/main
HEAD abc123
branch refs/heads/main

worktree /path/to/feature
HEAD def456
branch refs/heads/feature/test
`;

      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: mockOutput,
        stderr: '',
      } as any);

      const result = await WorktreeUtils.getWorktreeList('/path/to/main');

      expect(result).toHaveLength(2);
      // The isMain flag is set based on matching the path, not the branch
      expect(result[0]).toEqual({
        path: '/path/to/main',
        commit: 'abc123',
        branch: 'refs/heads/main',
        isMain: true,  // This will be set by the actual implementation
        exists: true,
      });
      expect(result[1]).toEqual({
        path: '/path/to/feature',
        commit: 'def456',
        branch: 'refs/heads/feature/test',
        isMain: false,
        exists: true,
      });
    });

    it('should handle empty worktree list', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      const result = await WorktreeUtils.getWorktreeList('/path/to/main');
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      (execAsync as jest.Mock).mockRejectedValueOnce(new Error('Command failed'));

      const result = await WorktreeUtils.getWorktreeList('/path/to/main');
      expect(result).toEqual([]);
    });
  });

  describe('createWorktree', () => {
    it('should create worktree with existing branch', async () => {
      (GitUtils.branchExists as jest.Mock).mockResolvedValueOnce(true);
      (GitUtils.checkout as jest.Mock).mockResolvedValueOnce(undefined);
      (GitUtils.addWorktree as jest.Mock).mockResolvedValueOnce(undefined);

      await WorktreeUtils.createWorktree(
        'test-feature',
        '/path/to/main',
        '/path/to/base',
        'project',
      );

      expect(GitUtils.checkout).toHaveBeenCalledWith(
        'feature/test-feature',
        '/path/to/main',
      );
      expect(GitUtils.addWorktree).toHaveBeenCalledWith(
        '/path/to/base/project-test-feature',
        'feature/test-feature',
        '/path/to/main',
      );
    });

    it('should create worktree with new branch', async () => {
      (GitUtils.branchExists as jest.Mock).mockResolvedValueOnce(false);
      (GitUtils.createBranch as jest.Mock).mockResolvedValueOnce(undefined);
      (GitUtils.addWorktree as jest.Mock).mockResolvedValueOnce(undefined);

      await WorktreeUtils.createWorktree(
        'new-feature',
        '/path/to/main',
        '/path/to/base',
        'project',
      );

      expect(GitUtils.createBranch).toHaveBeenCalledWith(
        'feature/new-feature',
        '/path/to/main',
      );
      expect(GitUtils.addWorktree).toHaveBeenCalledWith(
        '/path/to/base/project-new-feature',
        'feature/new-feature',
        '/path/to/main',
      );
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree without force', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      await WorktreeUtils.removeWorktree('/path/to/worktree', '/path/to/main');

      expect(execAsync).toHaveBeenCalledWith(
        'git worktree remove /path/to/worktree',
        {cwd: '/path/to/main'},
      );
    });

    it('should remove worktree with force', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      await WorktreeUtils.removeWorktree(
        '/path/to/worktree',
        '/path/to/main',
        true,
      );

      expect(execAsync).toHaveBeenCalledWith(
        'git worktree remove --force /path/to/worktree',
        {cwd: '/path/to/main'},
      );
    });
  });

  describe('cleanupWorktrees', () => {
    it('should prune worktrees and return results', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: 'Pruned worktree information for /path/to/old',
        stderr: '',
      } as any);

      const result = await WorktreeUtils.cleanupWorktrees('/path/to/main');

      expect(result.pruned).toBe(true);
      expect(result.removed).toContain(
        'Pruned worktree information for /path/to/old',
      );
      expect(execAsync).toHaveBeenCalledWith('git worktree prune', {
        cwd: '/path/to/main',
      });
    });

    it('should handle no worktrees to prune', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      const result = await WorktreeUtils.cleanupWorktrees('/path/to/main');

      expect(result.pruned).toBe(true);
      expect(result.removed).toEqual([]);
    });
  });

  describe('showWorktreeStatus', () => {
    it('should return worktree status with changes', async () => {
      (execAsync as jest.Mock)
        .mockResolvedValueOnce({
          stdout: 'M file1.ts\nA file2.ts',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: 'feature/test',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: 'abc123 First commit\ndef456 Second commit',
          stderr: '',
        } as any);

      const result = await WorktreeUtils.showWorktreeStatus('/path/to/worktree');

      expect(result).toEqual({
        branch: 'feature/test',
        hasChanges: true,
        changedFiles: ['M file1.ts', 'A file2.ts'],
        recentCommits: ['abc123 First commit', 'def456 Second commit'],
        isClean: false,
      });
    });

    it('should return clean worktree status', async () => {
      (execAsync as jest.Mock)
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: 'main',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        } as any);

      const result = await WorktreeUtils.showWorktreeStatus('/path/to/worktree');

      expect(result).toEqual({
        branch: 'main',
        hasChanges: false,
        changedFiles: [],
        recentCommits: [],
        isClean: true,
      });
    });

    it('should handle errors gracefully', async () => {
      (execAsync as jest.Mock).mockRejectedValueOnce(new Error('Command failed'));

      const result = await WorktreeUtils.showWorktreeStatus('/path/to/worktree');

      expect(result).toBeNull();
    });
  });

  describe('validateWorktreePath', () => {
    it('should return true for valid worktree path', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '.git',
        stderr: '',
      } as any);

      const result = await WorktreeUtils.validateWorktreePath(
        '/path/to/worktree',
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      (fs.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await WorktreeUtils.validateWorktreePath(
        '/path/to/invalid',
      );

      expect(result).toBe(false);
    });

    it('should return false for non-git directory', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      (execAsync as jest.Mock).mockRejectedValueOnce(new Error('Not a git repo'));

      const result = await WorktreeUtils.validateWorktreePath('/path/to/notgit');

      expect(result).toBe(false);
    });
  });
});