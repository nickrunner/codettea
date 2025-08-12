const mockExecAsync = jest.fn();
const mockFindGitProjects = jest.fn();
const mockGetCurrentBranch = jest.fn();

jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockExecAsync
}));

jest.mock('@codettea/core', () => ({
  ...jest.requireActual('@codettea/core'),
  findGitProjects: mockFindGitProjects,
  getCurrentBranch: mockGetCurrentBranch,
}));

import { ProjectsService } from './ProjectsService';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProjects', () => {
    it('should return project info for git repo', async () => {
      mockFindGitProjects.mockResolvedValueOnce([
        {
          name: 'test-project',
          path: '/path/to/test-project',
          hasClaudeMd: true
        }
      ]);
      mockGetCurrentBranch.mockResolvedValueOnce('main');
      mockExecAsync.mockResolvedValueOnce({ stdout: 'https://github.com/user/repo.git\n', stderr: '' }); // git remote

      const result = await service.getAllProjects();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'test-project',
        path: '/path/to/test-project',
        isGitRepo: true,
        hasClaudeConfig: true,
        currentBranch: 'main',
        remoteUrl: 'https://github.com/user/repo.git'
      });
    });

    it('should return project info for non-git repo', async () => {
      mockFindGitProjects.mockResolvedValueOnce([
        {
          name: 'non-git-project',
          path: '/path/to/non-git-project',
          hasClaudeMd: false
        }
      ]);
      mockGetCurrentBranch.mockRejectedValueOnce(new Error('Not a git repository'));

      const result = await service.getAllProjects();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'non-git-project',
        path: '/path/to/non-git-project',
        isGitRepo: true,
        hasClaudeConfig: false
      });
      expect(result[0].currentBranch).toBeUndefined();
      expect(result[0].remoteUrl).toBeUndefined();
    });

    it('should handle git status errors gracefully', async () => {
      mockFindGitProjects.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await service.getAllProjects();

      // Should return empty array when findGitProjects fails
      expect(result).toHaveLength(0);
    });
  });
});