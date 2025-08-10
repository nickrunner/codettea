import { Controller, Get, Route, Tags, Response } from 'tsoa';
import { ConfigService } from '../services/ConfigService';

export interface Configuration {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  claudeAvailable: boolean;
  githubAuthenticated: boolean;
}

@Route('config')
@Tags('Configuration')
export class ConfigController extends Controller {
  private configService: ConfigService;

  constructor() {
    super();
    this.configService = new ConfigService();
  }

  /**
   * Get current system configuration
   * @summary Get the current configuration settings
   */
  @Get()
  @Response<Configuration>(200, 'Current configuration')
  public async getConfig(): Promise<Configuration> {
    return this.configService.getConfiguration();
  }
}