const mockExecAsync = jest.fn();

jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockExecAsync
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
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' }) // git branch
        .mockResolvedValueOnce({ stdout: 'https://github.com/user/repo.git\n', stderr: '' }); // git remote

      const result = await service.getAllProjects();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: expect.any(String),
        path: expect.any(String),
        isGitRepo: true,
        currentBranch: 'main',
        remoteUrl: 'https://github.com/user/repo.git'
      });
    });

    it('should return project info for non-git repo', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Not a git repository'));

      const result = await service.getAllProjects();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: expect.any(String),
        path: expect.any(String),
        isGitRepo: false
      });
      expect(result[0].currentBranch).toBeUndefined();
      expect(result[0].remoteUrl).toBeUndefined();
    });

    it('should handle git status errors gracefully', async () => {
      mockExecAsync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.getAllProjects();

      // Should still return project info even if git commands fail
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: expect.any(String),
        path: expect.any(String),
        isGitRepo: false
      });
    });
  });
});