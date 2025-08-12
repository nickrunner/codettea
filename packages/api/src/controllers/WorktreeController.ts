import { Controller, Get, Post, Delete, Route, Tags, Path, Body } from 'tsoa';
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
  public async getWorktrees(): Promise<Worktree[]> {
    return this.worktreeService.getAllWorktrees();
  }

  /**
   * Create a new worktree
   * @summary Create a new git worktree for a feature
   */
  @Post()
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
  public async removeWorktree(@Path() path: string): Promise<void> {
    await this.worktreeService.removeWorktree(decodeURIComponent(path));
    this.setStatus(204);
  }

  /**
   * Cleanup unused worktrees
   * @summary Remove worktrees that are no longer needed
   */
  @Post('cleanup')
  public async cleanupWorktrees(): Promise<WorktreeCleanupResult> {
    return this.worktreeService.cleanupUnusedWorktrees();
  }

  /**
   * Get worktree status
   * @summary Get detailed status of a specific worktree
   */
  @Get('{path}/status')
  public async getWorktreeStatus(@Path() path: string): Promise<Worktree> {
    const worktree = await this.worktreeService.getWorktreeStatus(decodeURIComponent(path));
    if (!worktree) {
      this.setStatus(404);
      throw new Error(`Worktree at ${path} not found`);
    }
    return worktree;
  }
}