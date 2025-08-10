import { ConfigController } from './ConfigController';
import { ConfigService } from '../services/ConfigService';

jest.mock('../services/ConfigService');

describe('ConfigController', () => {
  let controller: ConfigController;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = new ConfigService() as jest.Mocked<ConfigService>;
    controller = new ConfigController();
    (controller as any).configService = mockConfigService;
  });

  describe('getConfig', () => {
    it('should return configuration from service', async () => {
      const mockConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to/worktrees',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend', 'backend', 'devops'],
        claudeAvailable: true,
        githubAuthenticated: true
      };

      mockConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const result = await controller.getConfig();

      expect(result).toEqual(mockConfig);
      expect(mockConfigService.getConfiguration).toHaveBeenCalled();
    });
  });
});