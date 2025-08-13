import { Project, ProjectConfig, ProjectBranch } from '../../controllers/ProjectsController';

export class ProjectsService {
  async getAllProjects(): Promise<Project[]> {
    return [
      {
        name: 'test-project',
        path: '/test/path',
        isGitRepo: true,
        currentBranch: 'main',
        remoteUrl: 'https://github.com/test/test-project.git',
        hasClaudeConfig: true
      }
    ];
  }

  async getProjectPath(projectName: string): Promise<string | undefined> {
    if (projectName === 'test-project') {
      return '/test/path';
    }
    return undefined;
  }

  async getSelectedProject(session?: any): Promise<string | null> {
    return session?.selectedProject || null;
  }

  async getProjectConfig(projectName: string): Promise<ProjectConfig> {
    if (projectName !== 'test-project') {
      throw new Error(`Project ${projectName} not found`);
    }
    return {
      mainRepoPath: '/test/path',
      baseWorktreePath: '/test/worktrees',
      maxConcurrentTasks: 2,
      requiredApprovals: 3,
      reviewerProfiles: ['frontend', 'backend', 'devops']
    };
  }

  async updateProjectConfig(
    projectName: string,
    config: Partial<ProjectConfig>
  ): Promise<ProjectConfig> {
    if (projectName !== 'test-project') {
      throw new Error(`Project ${projectName} not found`);
    }
    
    // Simulate validation
    if (config.mainRepoPath === '') {
      throw new Error('Main repository path is required');
    }
    if (config.maxConcurrentTasks !== undefined && config.maxConcurrentTasks <= 0) {
      throw new Error('Max concurrent tasks must be at least 1');
    }
    
    return {
      mainRepoPath: config.mainRepoPath ?? '/test/path',
      baseWorktreePath: config.baseWorktreePath ?? '/test/worktrees',
      maxConcurrentTasks: config.maxConcurrentTasks ?? 2,
      requiredApprovals: config.requiredApprovals ?? 3,
      reviewerProfiles: config.reviewerProfiles ?? ['frontend', 'backend', 'devops'],
      baseBranch: config.baseBranch
    };
  }

  async selectProject(projectName: string, session?: any): Promise<{
    success: boolean;
    message: string;
    project?: Project;
  }> {
    if (projectName === 'test-project') {
      if (session) {
        session.selectedProject = projectName;
        session.projectPath = '/test/path';
        session.projectSelectedAt = new Date().toISOString();
      }
      return {
        success: true,
        message: `Selected project ${projectName}`,
        project: {
          name: 'test-project',
          path: '/test/path',
          isGitRepo: true,
          currentBranch: 'main',
          remoteUrl: 'https://github.com/test/test-project.git',
          hasClaudeConfig: true
        }
      };
    }
    return {
      success: false,
      message: `Project ${projectName} not found`
    };
  }

  async getProjectBranches(projectName: string): Promise<ProjectBranch[]> {
    if (projectName !== 'test-project') {
      throw new Error(`Project ${projectName} not found`);
    }
    return [
      {
        name: 'main',
        isLocal: true,
        isRemote: true,
        isCurrent: true,
        isMerged: false,
        lastCommit: 'abc123'
      }
    ];
  }

  async getDefaultBranch(projectName: string): Promise<string> {
    if (projectName !== 'test-project') {
      throw new Error(`Project ${projectName} not found`);
    }
    return 'main';
  }
}