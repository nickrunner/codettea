import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { ProjectsController } from '../controllers/ProjectsController';

// Mock the services
jest.mock('../services/ProjectsService');
jest.mock('@codettea/core', () => ({
  findGitProjects: jest.fn().mockResolvedValue([
    { name: 'test-project', path: '/test/path', hasClaudeMd: true }
  ]),
  selectProject: jest.fn().mockReturnValue({
    name: 'test-project',
    path: '/test/path',
    hasClaudeMd: true
  }),
  loadProjectConfig: jest.fn().mockResolvedValue({
    baseBranch: 'main',
    maxConcurrentTasks: 2,
    requiredApprovals: 3,
    reviewerProfiles: ['frontend', 'backend']
  }),
  saveProjectConfig: jest.fn().mockResolvedValue(true),
  validateConfig: jest.fn().mockReturnValue({
    valid: true,
    errors: []
  }),
  getDefaultConfig: jest.fn().mockReturnValue({
    mainRepoPath: '/test/path',
    baseWorktreePath: '/test/worktrees',
    maxConcurrentTasks: 2,
    requiredApprovals: 3,
    reviewerProfiles: ['frontend', 'backend', 'devops'],
    baseBranch: 'main'
  }),
  getAllBranches: jest.fn().mockResolvedValue([]),
  getDefaultBranch: jest.fn().mockResolvedValue('main'),
  getCurrentBranch: jest.fn().mockResolvedValue('main')
}));

describe('Configuration Persistence Integration Tests', () => {
  let app: express.Application;
  let agent: any;

  beforeEach(() => {
    // Create Express app with session middleware
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Setup routes
    const controller = new ProjectsController();
    
    app.get('/projects', async (_req, res) => {
      const projects = await controller.getProjects();
      res.json(projects);
    });

    app.get('/projects/selected', async (req, res) => {
      const result = await controller.getSelectedProject(req as any);
      res.json(result);
    });

    app.post('/projects/:name/select', async (req, res) => {
      const result = await controller.selectProject(req.params.name, req as any);
      res.status(result.success ? 200 : 404).json(result);
    });

    app.get('/projects/:name/config', async (req, res) => {
      const config = await controller.getProjectConfig(req.params.name);
      res.json(config);
    });

    app.put('/projects/:name/config', async (req, res) => {
      const config = await controller.updateProjectConfig(req.params.name, req.body);
      res.json(config);
    });

    // Create agent for persistent cookies
    agent = request.agent(app);
  });

  describe('Project Selection Persistence', () => {
    it('should persist selected project in session', async () => {
      // Select a project
      const selectResponse = await agent
        .post('/projects/test-project/select')
        .expect(200);

      expect(selectResponse.body).toMatchObject({
        success: true,
        message: 'Selected project test-project'
      });

      // Verify selection is persisted
      const selectedResponse = await agent
        .get('/projects/selected')
        .expect(200);

      expect(selectedResponse.body).toMatchObject({
        selectedProject: 'test-project'
      });
    });

    it('should return null when no project is selected', async () => {
      const response = await agent
        .get('/projects/selected')
        .expect(200);

      expect(response.body).toMatchObject({
        selectedProject: null
      });
    });

    it('should handle non-existent project selection', async () => {
      const mockSelectProject = jest.fn().mockReturnValue(null);
      jest.requireMock('@codettea/core').selectProject = mockSelectProject;

      const response = await agent
        .post('/projects/non-existent/select')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Project non-existent not found'
      });
    });
  });

  describe('Configuration Management', () => {
    it('should load project configuration', async () => {
      const response = await agent
        .get('/projects/test-project/config')
        .expect(200);

      expect(response.body).toMatchObject({
        mainRepoPath: '/test/path',
        baseWorktreePath: '/test/worktrees',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend', 'backend', 'devops']
      });
    });

    it('should update project configuration', async () => {
      const newConfig = {
        maxConcurrentTasks: 4,
        requiredApprovals: 2,
        reviewerProfiles: ['frontend', 'backend', 'qa']
      };

      const response = await agent
        .put('/projects/test-project/config')
        .send(newConfig)
        .expect(200);

      expect(response.body).toMatchObject({
        maxConcurrentTasks: 4,
        requiredApprovals: 2,
        reviewerProfiles: ['frontend', 'backend', 'qa']
      });
    });

    it('should validate configuration before saving', async () => {
      const mockValidateConfig = jest.fn().mockReturnValue({
        valid: false,
        errors: ['Invalid configuration']
      });
      jest.requireMock('@codettea/core').validateConfig = mockValidateConfig;

      const invalidConfig = {
        maxConcurrentTasks: -1,
        requiredApprovals: 0
      };

      await agent
        .put('/projects/test-project/config')
        .send(invalidConfig)
        .expect(500);
    });
  });

  describe('Session Persistence Across Requests', () => {
    it('should maintain project selection across multiple requests', async () => {
      // Select a project
      await agent
        .post('/projects/test-project/select')
        .expect(200);

      // Make multiple requests with the same session
      for (let i = 0; i < 3; i++) {
        const response = await agent
          .get('/projects/selected')
          .expect(200);

        expect(response.body.selectedProject).toBe('test-project');
      }
    });

    it('should maintain separate sessions for different clients', async () => {
      // Client 1 selects a project
      const client1 = request.agent(app);
      await client1
        .post('/projects/test-project/select')
        .expect(200);

      // Client 2 has no selection
      const client2 = request.agent(app);
      const response = await client2
        .get('/projects/selected')
        .expect(200);

      expect(response.body.selectedProject).toBeNull();

      // Client 1 still has selection
      const client1Response = await client1
        .get('/projects/selected')
        .expect(200);

      expect(client1Response.body.selectedProject).toBe('test-project');
    });
  });

  describe('Configuration Validation', () => {
    it('should reject invalid mainRepoPath', async () => {
      const mockValidateConfig = jest.fn().mockReturnValue({
        valid: false,
        errors: ['Main repository path is required']
      });
      jest.requireMock('@codettea/core').validateConfig = mockValidateConfig;

      const invalidConfig = {
        mainRepoPath: '',
        baseWorktreePath: '/test/worktrees'
      };

      await agent
        .put('/projects/test-project/config')
        .send(invalidConfig)
        .expect(500);
    });

    it('should reject invalid concurrent tasks value', async () => {
      const mockValidateConfig = jest.fn().mockReturnValue({
        valid: false,
        errors: ['Max concurrent tasks must be at least 1']
      });
      jest.requireMock('@codettea/core').validateConfig = mockValidateConfig;

      const invalidConfig = {
        maxConcurrentTasks: 0
      };

      await agent
        .put('/projects/test-project/config')
        .send(invalidConfig)
        .expect(500);
    });

    it('should accept valid configuration', async () => {
      const validConfig = {
        mainRepoPath: '/valid/path',
        baseWorktreePath: '/valid/worktrees',
        maxConcurrentTasks: 3,
        requiredApprovals: 2,
        reviewerProfiles: ['frontend', 'backend'],
        baseBranch: 'develop'
      };

      const response = await agent
        .put('/projects/test-project/config')
        .send(validConfig)
        .expect(200);

      expect(response.body).toMatchObject(validConfig);
    });
  });
});