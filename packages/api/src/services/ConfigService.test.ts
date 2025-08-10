const mockExecAsync = jest.fn();

jest.mock('./ClaudeService');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockExecAsync
}));

import { ConfigService } from './ConfigService';
import { ClaudeService } from './ClaudeService';

describe('ConfigService', () => {
  let service: ConfigService;
  let mockClaudeService: jest.Mocked<ClaudeService>;

  beforeEach(() => {
    mockClaudeService = new ClaudeService() as jest.Mocked<ClaudeService>;
    (ClaudeService as jest.Mock).mockImplementation(() => mockClaudeService);
    
    service = new ConfigService();
    
    process.env.MAIN_REPO_PATH = '/test/repo';
    process.env.BASE_WORKTREE_PATH = '/test/worktrees';
    process.env.MAX_CONCURRENT_TASKS = '4';
    process.env.REQUIRED_APPROVALS = '2';
    process.env.REVIEWER_PROFILES = 'frontend,backend';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.MAIN_REPO_PATH;
    delete process.env.BASE_WORKTREE_PATH;
    delete process.env.MAX_CONCURRENT_TASKS;
    delete process.env.REQUIRED_APPROVALS;
    delete process.env.REVIEWER_PROFILES;
  });

  describe('getConfiguration', () => {
    it('should return current configuration with env vars', async () => {
      mockClaudeService.checkConnection.mockResolvedValue({
        connected: true,
        version: '1.0.0',
        message: 'Connected'
      });
      
      mockExecAsync.mockResolvedValue({ stdout: 'Logged in to GitHub', stderr: '' });

      const config = await service.getConfiguration();

      expect(config).toEqual({
        mainRepoPath: '/test/repo',
        baseWorktreePath: '/test/worktrees',
        maxConcurrentTasks: 4,
        requiredApprovals: 2,
        reviewerProfiles: ['frontend', 'backend'],
        claudeAvailable: true,
        githubAuthenticated: true
      });
    });

    it('should use default values when env vars are not set', async () => {
      delete process.env.MAIN_REPO_PATH;
      delete process.env.BASE_WORKTREE_PATH;
      delete process.env.MAX_CONCURRENT_TASKS;
      delete process.env.REQUIRED_APPROVALS;
      delete process.env.REVIEWER_PROFILES;

      mockClaudeService.checkConnection.mockResolvedValue({
        connected: false,
        message: 'Not connected'
      });
      
      mockExecAsync.mockRejectedValue(new Error('Not authenticated'));

      const config = await service.getConfiguration();

      expect(config.mainRepoPath).toBe(process.cwd());
      expect(config.baseWorktreePath).toBe('/Users/nickschrock/git');
      expect(config.maxConcurrentTasks).toBe(2);
      expect(config.requiredApprovals).toBe(3);
      expect(config.reviewerProfiles).toEqual(['frontend', 'backend', 'devops']);
      expect(config.claudeAvailable).toBe(false);
      expect(config.githubAuthenticated).toBe(false);
    });
  });
});