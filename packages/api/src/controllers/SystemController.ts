import { Controller, Get, Post, Route, Tags, Response, Body } from 'tsoa';
import { SystemService } from '../services/SystemService';

export interface SystemStatus {
  git: {
    installed: boolean;
    version?: string;
  };
  github: {
    authenticated: boolean;
    user?: string;
  };
  claude: {
    available: boolean;
    location?: string;
  };
  worktrees: {
    count: number;
    paths: string[];
  };
  currentBranch: string;
  defaultBranch: string;
}

export interface BranchStatus {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  isCurrent: boolean;
  isMerged?: boolean;
  lastCommit?: string;
}

export interface BranchCleanupRequest {
  deleteMerged?: boolean;
  deleteRemote?: boolean;
  branches?: string[];
  dryRun?: boolean;
}

export interface BranchCleanupResult {
  deleted: string[];
  failed: string[];
  skipped: string[];
  message: string;
}

@Route('system')
@Tags('System')
export class SystemController extends Controller {
  private systemService: SystemService;

  constructor() {
    super();
    this.systemService = new SystemService();
  }

  /**
   * Get comprehensive system status
   * @summary Check the status of all system components
   */
  @Get('status')
  @Response<SystemStatus>(200, 'System status')
  public async getSystemStatus(): Promise<SystemStatus> {
    return this.systemService.getSystemStatus();
  }

  /**
   * Check Claude Code availability
   * @summary Verify if Claude Code CLI is available and working
   */
  @Get('claude-status')
  @Response<{available: boolean; location?: string}>(200, 'Claude status')
  public async getClaudeStatus(): Promise<{
    available: boolean;
    location?: string;
  }> {
    return this.systemService.checkClaudeCode();
  }

  /**
   * Test system configuration
   * @summary Run tests to verify system configuration is correct
   */
  @Post('test-config')
  @Response<{success: boolean; results: Record<string, boolean>}>(200, 'Test results')
  public async testConfiguration(): Promise<{
    success: boolean;
    results: Record<string, boolean>;
  }> {
    return this.systemService.testConfiguration();
  }

  /**
   * Get all branches status
   * @summary Get status of all branches in the repository
   */
  @Get('branches/status')
  @Response<BranchStatus[]>(200, 'Branch status list')
  public async getBranchesStatus(): Promise<BranchStatus[]> {
    return this.systemService.getAllBranchesStatus();
  }

  /**
   * Cleanup branches
   * @summary Clean up merged or specific branches
   */
  @Post('branches/cleanup')
  @Response<BranchCleanupResult>(200, 'Cleanup results')
  public async cleanupBranches(
    @Body() request: BranchCleanupRequest
  ): Promise<BranchCleanupResult> {
    return this.systemService.cleanupBranches(request);
  }
}