import { Controller, Get, Post, Delete, Route, Tags, Response, Path, Body } from 'tsoa';
import { WorktreeService } from '../services/WorktreeService';

export interface Worktree {
  path: string;
  branch: string;
  head: string;
  isMain: boolean;
  hasChanges?: boolean;
  filesChanged?: number;
}

export interface CreateWorktreeRequest {
  featureName: string;
  branch?: string;
  baseBranch?: string;
}

export interface WorktreeCleanupResult {
  removed: string[];
  failed: string[];
  message: string;
}

@Route('worktrees')
@Tags('Worktrees')
export class WorktreeController extends Controller {
  private worktreeService: WorktreeService;

  constructor() {
    super();
    this.worktreeService = new WorktreeService();
  }

  /**
   * List all worktrees
   * @summary Get a list of all git worktrees
   */
  @Get()
  @Response<Worktree[]>(200, 'List of worktrees')
  public async getWorktrees(): Promise<Worktree[]> {
    return this.worktreeService.getAllWorktrees();
  }

  /**
   * Create a new worktree
   * @summary Create a new git worktree for a feature
   */
  @Post()
  @Response<Worktree>(201, 'Worktree created')
  @Response(400, 'Invalid request')
  @Response(409, 'Worktree already exists')
  public async createWorktree(@Body() request: CreateWorktreeRequest): Promise<Worktree> {
    const worktree = await this.worktreeService.createWorktree(request);
    this.setStatus(201);
    return worktree;
  }

  /**
   * Remove a worktree
   * @summary Remove a git worktree
   */
  @Delete('{path}')
  @Response(204, 'Worktree removed')
  @Response(404, 'Worktree not found')
  @Response(400, 'Cannot remove main worktree')
  public async removeWorktree(@Path() path: string): Promise<void> {
    await this.worktreeService.removeWorktree(decodeURIComponent(path));
    this.setStatus(204);
  }

  /**
   * Cleanup unused worktrees
   * @summary Remove worktrees that are no longer needed
   */
  @Post('cleanup')
  @Response<WorktreeCleanupResult>(200, 'Cleanup results')
  public async cleanupWorktrees(): Promise<WorktreeCleanupResult> {
    return this.worktreeService.cleanupUnusedWorktrees();
  }

  /**
   * Get worktree status
   * @summary Get detailed status of a specific worktree
   */
  @Get('{path}/status')
  @Response<Worktree>(200, 'Worktree status')
  @Response(404, 'Worktree not found')
  public async getWorktreeStatus(@Path() path: string): Promise<Worktree> {
    const worktree = await this.worktreeService.getWorktreeStatus(decodeURIComponent(path));
    if (!worktree) {
      this.setStatus(404);
      throw new Error(`Worktree at ${path} not found`);
    }
    return worktree;
  }
}