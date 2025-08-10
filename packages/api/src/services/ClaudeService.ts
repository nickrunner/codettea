import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class ClaudeService {
  async checkConnection(): Promise<{ connected: boolean; version?: string; message: string }> {
    try {
      const { stdout } = await execAsync('claude --version', { timeout: 5000 });
      const version = stdout.trim();
      logger.info(`Claude CLI version: ${version}`);
      
      return {
        connected: true,
        version,
        message: 'Claude CLI is available and ready'
      };
    } catch (error) {
      logger.error('Claude CLI check failed:', error);
      return {
        connected: false,
        message: 'Claude CLI is not available. Please ensure it is installed and in PATH.'
      };
    }
  }
}