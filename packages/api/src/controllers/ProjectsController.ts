import { Controller, Get, Route, Tags, Response } from 'tsoa';
import { ProjectsService } from '../services/ProjectsService';

export interface Project {
  name: string;
  path: string;
  isGitRepo: boolean;
  currentBranch?: string;
  remoteUrl?: string;
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
   * @summary List all projects configured in the system
   */
  @Get()
  @Response<Project[]>(200, 'List of projects')
  public async getProjects(): Promise<Project[]> {
    return this.projectsService.getAllProjects();
  }
}