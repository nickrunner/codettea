import { Controller, Get, Route, Tags } from 'tsoa';
import { ClaudeService } from '../services/ClaudeService';

interface ClaudeStatus {
  connected: boolean;
  version?: string;
  message: string;
  lastChecked: string;
}

@Route('claude')
@Tags('Claude')
export class ClaudeController extends Controller {
  private claudeService: ClaudeService;

  constructor() {
    super();
    this.claudeService = new ClaudeService();
  }

  /**
   * Test Claude CLI connection status
   * @summary Check if Claude CLI is available and properly configured
   */
  @Get('status')
  public async getClaudeStatus(): Promise<ClaudeStatus> {
    const status = await this.claudeService.checkConnection();
    return {
      ...status,
      lastChecked: new Date().toISOString()
    };
  }
}

