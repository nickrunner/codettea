import { SystemController } from './SystemController';
import { SystemService } from '../services/SystemService';

jest.mock('../services/SystemService');

describe('SystemController', () => {
  let controller: SystemController;
  let mockSystemService: jest.Mocked<SystemService>;

  beforeEach(() => {
    controller = new SystemController();
    mockSystemService = (controller as any).systemService as jest.Mocked<SystemService>;
  });

  describe('getSystemStatus', () => {
    it('should return system status', async () => {
      const mockStatus = {
        git: { installed: true, version: '2.39.0' },
        github: { authenticated: true, user: 'testuser' },
        claude: { available: true, location: '/usr/local/bin/claude' },
        worktrees: { count: 2, paths: ['/path/1', '/path/2'] },
        currentBranch: 'main',
        defaultBranch: 'main',
      };

      mockSystemService.getSystemStatus.mockResolvedValue(mockStatus);

      const result = await controller.getSystemStatus();

      expect(result).toEqual(mockStatus);
      expect(mockSystemService.getSystemStatus).toHaveBeenCalled();
    });
  });

  describe('getClaudeStatus', () => {
    it('should return Claude Code availability status', async () => {
      const mockClaudeStatus = {
        available: true,
        location: '/usr/local/bin/claude',
      };

      mockSystemService.checkClaudeCode.mockResolvedValue(mockClaudeStatus);

      const result = await controller.getClaudeStatus();

      expect(result).toEqual(mockClaudeStatus);
      expect(mockSystemService.checkClaudeCode).toHaveBeenCalled();
    });

    it('should handle unavailable Claude Code', async () => {
      const mockClaudeStatus = {
        available: false,
      };

      mockSystemService.checkClaudeCode.mockResolvedValue(mockClaudeStatus);

      const result = await controller.getClaudeStatus();

      expect(result).toEqual(mockClaudeStatus);
      expect(mockSystemService.checkClaudeCode).toHaveBeenCalled();
    });
  });

  describe('testConfiguration', () => {
    it('should return successful configuration test results', async () => {
      const mockTestResults = {
        success: true,
        results: {
          git: true,
          github: true,
          claude: true,
          worktrees: true,
        },
      };

      mockSystemService.testConfiguration.mockResolvedValue(mockTestResults);

      const result = await controller.testConfiguration();

      expect(result).toEqual(mockTestResults);
      expect(mockSystemService.testConfiguration).toHaveBeenCalled();
    });

    it('should handle failed configuration tests', async () => {
      const mockTestResults = {
        success: false,
        results: {
          git: true,
          github: false,
          claude: true,
          worktrees: true,
        },
      };

      mockSystemService.testConfiguration.mockResolvedValue(mockTestResults);

      const result = await controller.testConfiguration();

      expect(result).toEqual(mockTestResults);
      expect(mockSystemService.testConfiguration).toHaveBeenCalled();
    });
  });

  describe('getBranchesStatus', () => {
    it('should return branches status', async () => {
      const mockBranches = [
        {
          name: 'main',
          isLocal: true,
          isRemote: true,
          isCurrent: true,
          isMerged: false,
          lastCommit: 'abc123',
        },
        {
          name: 'feature/test',
          isLocal: true,
          isRemote: false,
          isCurrent: false,
          isMerged: true,
          lastCommit: 'def456',
        },
      ];

      mockSystemService.getAllBranchesStatus.mockResolvedValue(mockBranches);

      const result = await controller.getBranchesStatus();

      expect(result).toEqual(mockBranches);
      expect(mockSystemService.getAllBranchesStatus).toHaveBeenCalled();
    });
  });

  describe('cleanupBranches', () => {
    it('should perform dry run branch cleanup', async () => {
      const mockRequest = {
        dryRun: true,
        deleteMerged: true,
      };

      const mockResult = {
        deleted: [],
        failed: [],
        skipped: ['feature/old-1', 'feature/old-2'],
        message: 'Dry run: Would delete 2 branches and 0 remote references',
      };

      mockSystemService.cleanupBranches.mockResolvedValue(mockResult);

      const result = await controller.cleanupBranches(mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockSystemService.cleanupBranches).toHaveBeenCalledWith(mockRequest);
    });

    it('should delete specific branches', async () => {
      const mockRequest = {
        branches: ['feature/old-1', 'feature/old-2'],
        dryRun: false,
      };

      const mockResult = {
        deleted: ['feature/old-1', 'feature/old-2'],
        failed: [],
        skipped: [],
        message: 'Deleted 2 branches',
      };

      mockSystemService.cleanupBranches.mockResolvedValue(mockResult);

      const result = await controller.cleanupBranches(mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockSystemService.cleanupBranches).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle cleanup failures', async () => {
      const mockRequest = {
        deleteMerged: true,
        dryRun: false,
      };

      const mockResult = {
        deleted: ['feature/old-1'],
        failed: ['feature/protected'],
        skipped: [],
        message: 'Deleted 1 merged branches',
      };

      mockSystemService.cleanupBranches.mockResolvedValue(mockResult);

      const result = await controller.cleanupBranches(mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockSystemService.cleanupBranches).toHaveBeenCalledWith(mockRequest);
    });
  });
});