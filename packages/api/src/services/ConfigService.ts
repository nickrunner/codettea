import { Configuration } from '../controllers/ConfigController';
import { ClaudeService } from './ClaudeService';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class ConfigService {
  private claudeService: ClaudeService;

  constructor() {
    this.claudeService = new ClaudeService();
  }

  async getConfiguration(): Promise<Configuration> {
    const [claudeStatus, githubAuth] = await Promise.all([
      this.claudeService.checkConnection(),
      this.checkGithubAuth()
    ]);

    return {
      mainRepoPath: process.env.MAIN_REPO_PATH || process.cwd(),
      baseWorktreePath: process.env.BASE_WORKTREE_PATH || '/Users/nickschrock/git',
      maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '2'),
      requiredApprovals: parseInt(process.env.REQUIRED_APPROVALS || '3'),
      reviewerProfiles: (process.env.REVIEWER_PROFILES || 'frontend,backend,devops').split(','),
      claudeAvailable: claudeStatus.connected,
      githubAuthenticated: githubAuth
    };
  }

  private async checkGithubAuth(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('gh auth status', { timeout: 5000 });
      return stdout.includes('Logged in');
    } catch (error) {
      logger.warn('GitHub CLI not authenticated');
      return false;
    }
  }
}