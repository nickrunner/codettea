import { WorktreeController } from './WorktreeController';
import { WorktreeService } from '../services/WorktreeService';

jest.mock('../services/WorktreeService');

describe('WorktreeController', () => {
  let controller: WorktreeController;
  let mockWorktreeService: jest.Mocked<WorktreeService>;

  beforeEach(() => {
    controller = new WorktreeController();
    mockWorktreeService = (controller as any).worktreeService as jest.Mocked<WorktreeService>;
    jest.clearAllMocks();
  });

  describe('getWorktrees', () => {
    it('should return list of worktrees', async () => {
      const mockWorktrees = [
        {
          path: '/path/to/main',
          branch: 'main',
          head: 'abc123',
          isMain: true,
          hasChanges: false,
          filesChanged: 0,
        },
        {
          path: '/path/to/feature',
          branch: 'feature/test',
          head: 'def456',
          isMain: false,
          hasChanges: true,
          filesChanged: 3,
        },
      ];

      mockWorktreeService.getAllWorktrees.mockResolvedValue(mockWorktrees);

      const result = await controller.getWorktrees();

      expect(result).toEqual(mockWorktrees);
      expect(mockWorktreeService.getAllWorktrees).toHaveBeenCalled();
    });

    it('should handle empty worktree list', async () => {
      mockWorktreeService.getAllWorktrees.mockResolvedValue([]);

      const result = await controller.getWorktrees();

      expect(result).toEqual([]);
      expect(mockWorktreeService.getAllWorktrees).toHaveBeenCalled();
    });
  });

  describe('createWorktree', () => {
    it('should create a new worktree', async () => {
      const mockRequest = {
        featureName: 'new-feature',
        branch: 'feature/new-feature',
        baseBranch: 'main',
      };

      const mockWorktree = {
        path: '/path/to/new-feature',
        branch: 'feature/new-feature',
        head: 'HEAD',
        isMain: false,
        hasChanges: false,
        filesChanged: 0,
      };

      mockWorktreeService.createWorktree.mockResolvedValue(mockWorktree);
      const setStatusSpy = jest.spyOn(controller, 'setStatus');

      const result = await controller.createWorktree(mockRequest);

      expect(result).toEqual(mockWorktree);
      expect(mockWorktreeService.createWorktree).toHaveBeenCalledWith(mockRequest);
      expect(setStatusSpy).toHaveBeenCalledWith(201);
    });

    it('should handle creation with minimal request', async () => {
      const mockRequest = {
        featureName: 'minimal-feature',
      };

      const mockWorktree = {
        path: '/path/to/minimal-feature',
        branch: 'feature/minimal-feature',
        head: 'HEAD',
        isMain: false,
        hasChanges: false,
        filesChanged: 0,
      };

      mockWorktreeService.createWorktree.mockResolvedValue(mockWorktree);

      const result = await controller.createWorktree(mockRequest);

      expect(result).toEqual(mockWorktree);
      expect(mockWorktreeService.createWorktree).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('removeWorktree', () => {
    it('should remove a worktree', async () => {
      const path = '/path/to/feature';
      mockWorktreeService.removeWorktree.mockResolvedValue(undefined);
      const setStatusSpy = jest.spyOn(controller, 'setStatus');

      await controller.removeWorktree(path);

      expect(mockWorktreeService.removeWorktree).toHaveBeenCalledWith(path);
      expect(setStatusSpy).toHaveBeenCalledWith(204);
    });

    it('should handle URL-encoded paths', async () => {
      const encodedPath = encodeURIComponent('/path/with spaces/feature');
      mockWorktreeService.removeWorktree.mockResolvedValue(undefined);

      await controller.removeWorktree(encodedPath);

      expect(mockWorktreeService.removeWorktree).toHaveBeenCalledWith('/path/with spaces/feature');
    });
  });

  describe('cleanupWorktrees', () => {
    it('should cleanup unused worktrees', async () => {
      const mockResult = {
        removed: ['/path/to/old-1', '/path/to/old-2'],
        failed: [],
        message: 'Removed 2 worktrees',
      };

      mockWorktreeService.cleanupUnusedWorktrees.mockResolvedValue(mockResult);

      const result = await controller.cleanupWorktrees();

      expect(result).toEqual(mockResult);
      expect(mockWorktreeService.cleanupUnusedWorktrees).toHaveBeenCalled();
    });

    it('should handle partial cleanup failures', async () => {
      const mockResult = {
        removed: ['/path/to/old-1'],
        failed: ['/path/to/locked'],
        message: 'Removed 1 worktrees, failed to remove 1',
      };

      mockWorktreeService.cleanupUnusedWorktrees.mockResolvedValue(mockResult);

      const result = await controller.cleanupWorktrees();

      expect(result).toEqual(mockResult);
      expect(mockWorktreeService.cleanupUnusedWorktrees).toHaveBeenCalled();
    });
  });

  describe('getWorktreeStatus', () => {
    it('should return worktree status', async () => {
      const path = '/path/to/feature';
      const mockWorktree = {
        path: '/path/to/feature',
        branch: 'feature/test',
        head: 'abc123',
        isMain: false,
        hasChanges: true,
        filesChanged: 5,
      };

      mockWorktreeService.getWorktreeStatus.mockResolvedValue(mockWorktree);

      const result = await controller.getWorktreeStatus(path);

      expect(result).toEqual(mockWorktree);
      expect(mockWorktreeService.getWorktreeStatus).toHaveBeenCalledWith(path);
    });

    it('should handle URL-encoded paths', async () => {
      const encodedPath = encodeURIComponent('/path/with spaces/feature');
      const mockWorktree = {
        path: '/path/with spaces/feature',
        branch: 'feature/test',
        head: 'abc123',
        isMain: false,
        hasChanges: false,
        filesChanged: 0,
      };

      mockWorktreeService.getWorktreeStatus.mockResolvedValue(mockWorktree);

      const result = await controller.getWorktreeStatus(encodedPath);

      expect(result).toEqual(mockWorktree);
      expect(mockWorktreeService.getWorktreeStatus).toHaveBeenCalledWith('/path/with spaces/feature');
    });

    it('should throw error when worktree not found', async () => {
      const path = '/path/to/nonexistent';
      mockWorktreeService.getWorktreeStatus.mockResolvedValue(null);
      const setStatusSpy = jest.spyOn(controller, 'setStatus');

      await expect(controller.getWorktreeStatus(path)).rejects.toThrow(
        `Worktree at ${path} not found`
      );

      expect(setStatusSpy).toHaveBeenCalledWith(404);
      expect(mockWorktreeService.getWorktreeStatus).toHaveBeenCalledWith(path);
    });
  });
});