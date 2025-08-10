import { ProjectsController } from './ProjectsController';
import { ProjectsService } from '../services/ProjectsService';

jest.mock('../services/ProjectsService');

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let mockProjectsService: jest.Mocked<ProjectsService>;

  beforeEach(() => {
    mockProjectsService = new ProjectsService() as jest.Mocked<ProjectsService>;
    controller = new ProjectsController();
    (controller as any).projectsService = mockProjectsService;
  });

  describe('getProjects', () => {
    it('should return projects from service', async () => {
      const mockProjects = [
        { name: 'project1', path: '/path/to/project1', isGitRepo: true },
        { name: 'project2', path: '/path/to/project2', isGitRepo: false }
      ];

      mockProjectsService.getAllProjects.mockResolvedValue(mockProjects);

      const result = await controller.getProjects();

      expect(result).toEqual(mockProjects);
      expect(mockProjectsService.getAllProjects).toHaveBeenCalled();
    });
  });
});