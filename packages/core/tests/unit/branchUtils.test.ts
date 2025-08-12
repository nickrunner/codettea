const execAsync = jest.fn();

jest.mock('child_process');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(() => execAsync),
}));

import * as BranchUtils from '../../src/utils/branches';

describe('Branch Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    execAsync.mockClear();
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getAllBranches', () => {
    it('should parse branch list with tracking info', async () => {
      const mockOutput = `* main                abc123 [origin/main: ahead 1, behind 2] Latest commit
  feature/test        def456 [origin/feature/test] Test feature
  local-only          ghi789 Local branch`;

      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: mockOutput,
        stderr: '',
      } as any);

      const result = await BranchUtils.getAllBranches('/path/to/repo');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'main',
        isCurrent: true,
        isRemote: false,
        lastCommit: 'abc123',
        upstream: 'origin/main',
        ahead: 1,
        behind: 2,
      });
      expect(result[1]).toMatchObject({
        name: 'feature/test',
        isCurrent: false,
        upstream: 'origin/feature/test',
      });
      expect(result[2]).toMatchObject({
        name: 'local-only',
        isCurrent: false,
        upstream: undefined,
      });
    });

    it('should handle empty branch list', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      const result = await BranchUtils.getAllBranches('/path/to/repo');
      expect(result).toEqual([]);
    });
  });

  describe('getMergedBranches', () => {
    it('should return merged branches excluding protected ones', async () => {
      const mockOutput = `* main
  feature/merged-1
  feature/merged-2
  dev
  master`;

      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: mockOutput,
        stderr: '',
      } as any);

      const result = await BranchUtils.getMergedBranches('main', '/path/to/repo');

      expect(result).toEqual(['feature/merged-1', 'feature/merged-2']);
      expect(result).not.toContain('main');
      expect(result).not.toContain('dev');
      expect(result).not.toContain('master');
    });

    it('should handle no merged branches', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '* main',
        stderr: '',
      } as any);

      const result = await BranchUtils.getMergedBranches('main', '/path/to/repo');
      expect(result).toEqual([]);
    });
  });

  describe('deleteBranches', () => {
    it('should delete branches successfully', async () => {
      (execAsync as jest.Mock).mockResolvedValue({
        stdout: '',
        stderr: '',
      } as any);

      const result = await BranchUtils.deleteBranches(
        ['feature/old', 'feature/done'],
        '/path/to/repo',
      );

      expect(result.deleted).toEqual(['feature/old', 'feature/done']);
      expect(result.failed).toEqual([]);
      expect(result.total).toBe(2);
    });

    it('should skip protected branches', async () => {
      const result = await BranchUtils.deleteBranches(
        ['main', 'feature/old', 'master'],
        '/path/to/repo',
      );

      expect(result.deleted).toEqual(['feature/old']);
      expect(result.skipped).toEqual([]);
      expect(execAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle force delete option', async () => {
      (execAsync as jest.Mock).mockResolvedValue({
        stdout: '',
        stderr: '',
      } as any);

      await BranchUtils.deleteBranches(['feature/unmerged'], '/path/to/repo', {
        force: true,
      });

      expect(execAsync).toHaveBeenCalledWith('git branch -D "feature/unmerged"', {
        cwd: '/path/to/repo',
      });
    });

    it('should handle dry run option', async () => {
      const result = await BranchUtils.deleteBranches(
        ['feature/test'],
        '/path/to/repo',
        {dryRun: true},
      );

      expect(result.skipped).toEqual(['feature/test']);
      expect(result.deleted).toEqual([]);
      expect(execAsync).not.toHaveBeenCalled();
    });

    it('should handle unmerged branches without force', async () => {
      (execAsync as jest.Mock).mockRejectedValueOnce(
        new Error('not fully merged'),
      );

      const result = await BranchUtils.deleteBranches(
        ['feature/unmerged'],
        '/path/to/repo',
      );

      expect(result.skipped).toEqual(['feature/unmerged']);
      expect(result.deleted).toEqual([]);
    });
  });

  describe('cleanupRemoteReferences', () => {
    it('should clean remote references', async () => {
      const mockOutput = ` * [pruned] origin/deleted-branch-1
 * [pruned] origin/deleted-branch-2`;

      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: mockOutput,
        stderr: '',
      } as any);

      const result = await BranchUtils.cleanupRemoteReferences('/path/to/repo');

      expect(result).toEqual([
        'origin/deleted-branch-1',
        'origin/deleted-branch-2',
      ]);
    });

    it('should handle dry run for remote references', async () => {
      const mockOutput = ` * [would prune] origin/would-delete`;

      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: mockOutput,
        stderr: '',
      } as any);

      const result = await BranchUtils.cleanupRemoteReferences(
        '/path/to/repo',
        true,
      );

      expect(result).toEqual(['origin/would-delete']);
      expect(execAsync).toHaveBeenCalledWith(
        'git remote prune origin --dry-run',
        {cwd: '/path/to/repo'},
      );
    });

    it('should return empty array when no references to prune', async () => {
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      const result = await BranchUtils.cleanupRemoteReferences('/path/to/repo');
      expect(result).toEqual([]);
    });
  });

  describe('fullBranchCleanup', () => {
    it('should perform full cleanup', async () => {
      // Mock getMergedBranches
      (execAsync as jest.Mock)
        .mockResolvedValueOnce({
          stdout: '* main\n  feature/merged',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: '* main\n  feature/merged',
          stderr: '',
        } as any);

      // Mock deleteBranches
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      // Mock cleanupRemoteReferences
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: ' * [pruned] origin/deleted',
        stderr: '',
      } as any);

      const result = await BranchUtils.fullBranchCleanup('/path/to/repo', {
        skipConfirmation: true,
      });

      expect(result.branches.deleted).toContain('feature/merged');
      expect(result.remoteRefs).toContain('origin/deleted');
    });
  });

  describe('previewCleanup', () => {
    it('should preview what would be cleaned up', async () => {
      // Mock merged branches
      (execAsync as jest.Mock)
        .mockResolvedValueOnce({
          stdout: '* main\n  feature/old',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: '* dev\n  feature/done',
          stderr: '',
        } as any);

      // Mock remote references dry run
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: ' * [would prune] origin/deleted',
        stderr: '',
      } as any);

      const result = await BranchUtils.previewCleanup('/path/to/repo');

      expect(result.mergedBranches).toContain('feature/old');
      expect(result.mergedBranches).toContain('feature/done');
      expect(result.remoteReferences).toContain('origin/deleted');
    });
  });

  describe('showAllBranchesStatus', () => {
    it('should return comprehensive branch status', async () => {
      // Mock local branches
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '* main                abc123 [origin/main] Latest',
        stderr: '',
      } as any);

      // Mock remote branches
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '  origin/main\n  origin/feature/test',
        stderr: '',
      } as any);

      // Mock current branch
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: 'main',
        stderr: '',
      } as any);

      const result = await BranchUtils.showAllBranchesStatus('/path/to/repo');

      expect(result.local).toHaveLength(1);
      expect(result.local[0].name).toBe('main');
      expect(result.remote).toEqual(['origin/main', 'origin/feature/test']);
      expect(result.current).toBe('main');
    });
  });

  describe('handleBranchCleanup', () => {
    it('should handle merged mode', async () => {
      (execAsync as jest.Mock)
        .mockResolvedValueOnce({
          stdout: '* main\n  feature/merged',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        } as any);

      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any);

      const result = await BranchUtils.handleBranchCleanup(
        '/path/to/repo',
        'merged',
        {skipConfirmation: true},
      );

      expect(result).toHaveProperty('deleted');
    });

    it('should handle specific mode', async () => {
      (execAsync as jest.Mock).mockResolvedValue({
        stdout: '',
        stderr: '',
      } as any);

      const result = await BranchUtils.handleBranchCleanup(
        '/path/to/repo',
        'specific',
        {skipConfirmation: true},
        ['feature/test'],
      );

      expect(result).toHaveProperty('deleted');
    });

    it('should handle preview mode', async () => {
      (execAsync as jest.Mock)
        .mockResolvedValueOnce({
          stdout: '* main',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: '* dev',
          stderr: '',
        } as any)
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        } as any);

      const result = await BranchUtils.handleBranchCleanup(
        '/path/to/repo',
        'preview',
      );

      expect(result).toHaveProperty('mergedBranches');
      expect(result).toHaveProperty('remoteReferences');
    });

    it('should throw error for unknown mode', async () => {
      await expect(
        BranchUtils.handleBranchCleanup('/path/to/repo', 'invalid' as any),
      ).rejects.toThrow('Unknown cleanup mode: invalid');
    });

    it('should throw error for specific mode without branches', async () => {
      await expect(
        BranchUtils.handleBranchCleanup('/path/to/repo', 'specific'),
      ).rejects.toThrow('No branches specified for deletion');
    });
  });
});