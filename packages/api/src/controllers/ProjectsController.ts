import { Controller, Get, Post, Put, Route, Tags, Response, Path, Body } from 'tsoa';
import { ProjectsService } from '../services/ProjectsService';

export interface Project {
  name: string;
  path: string;
  isGitRepo: boolean;
  currentBranch?: string;
  remoteUrl?: string;
  hasClaudeConfig?: boolean;
}

export interface ProjectConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  baseBranch?: string;
}

export interface ProjectBranch {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  isCurrent: boolean;
  isMerged?: boolean;
  lastCommit?: string;
}

@Route('projects')
@Tags('Projects')
export class ProjectsController extends Controller {
  private projectsService: ProjectsService;

  constructor() {
    super();
    this.projectsService = new ProjectsService();
  }

  /**
   * Get all available projects
   * @summary List all git projects in the configured directory
   */
  @Get()
  @Response<Project[]>(200, 'List of projects')
  public async getProjects(): Promise<Project[]> {
    return this.projectsService.getAllProjects();
  }

  /**
   * Get project configuration
   * @summary Get configuration settings for a specific project
   */
  @Get('{name}/config')
  @Response<ProjectConfig>(200, 'Project configuration')
  @Response(404, 'Project not found')
  public async getProjectConfig(@Path() name: string): Promise<ProjectConfig> {
    return this.projectsService.getProjectConfig(name);
  }

  /**
   * Update project configuration
   * @summary Update configuration settings for a specific project
   */
  @Put('{name}/config')
  @Response<ProjectConfig>(200, 'Updated configuration')
  @Response(404, 'Project not found')
  @Response(400, 'Invalid configuration')
  public async updateProjectConfig(
    @Path() name: string,
    @Body() config: Partial<ProjectConfig>
  ): Promise<ProjectConfig> {
    return this.projectsService.updateProjectConfig(name, config);
  }

  /**
   * Select active project
   * @summary Set a project as the currently active project
   */
  @Post('{name}/select')
  @Response(200, 'Project selected')
  @Response(404, 'Project not found')
  public async selectProject(@Path() name: string): Promise<{
    success: boolean;
    message: string;
    project?: Project;
  }> {
    const result = await this.projectsService.selectProject(name);
    if (!result.success) {
      this.setStatus(404);
    }
    return result;
  }

  /**
   * Get project branches
   * @summary List all branches for a specific project
   */
  @Get('{name}/branches')
  @Response<ProjectBranch[]>(200, 'List of branches')
  @Response(404, 'Project not found')
  public async getProjectBranches(@Path() name: string): Promise<ProjectBranch[]> {
    return this.projectsService.getProjectBranches(name);
  }

  /**
   * Get default branch
   * @summary Get the default branch name for a project
   */
  @Get('{name}/default-branch')
  @Response<string>(200, 'Default branch name')
  @Response(404, 'Project not found')
  public async getDefaultBranch(@Path() name: string): Promise<string> {
    return this.projectsService.getDefaultBranch(name);
  }
}