import { Project } from '../controllers/ProjectsController';
import { logger } from '../utils/logger';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';

const execFileAsync = promisify(execFile);

export class ProjectsService {
  private mainRepoPath = process.env.MAIN_REPO_PATH || process.cwd();

  async getAllProjects(): Promise<Project[]> {
    try {
      // Validate path exists and is a directory
      if (!await fs.pathExists(this.mainRepoPath)) {
        logger.error(`Main repo path does not exist: ${this.mainRepoPath}`);
        return [];
      }

      const stat = await fs.stat(this.mainRepoPath);
      if (!stat.isDirectory()) {
        logger.error(`Main repo path is not a directory: ${this.mainRepoPath}`);
        return [];
      }

      const project: Project = {
        name: path.basename(this.mainRepoPath),
        path: this.mainRepoPath,
        isGitRepo: await this.isGitRepo(this.mainRepoPath)
      };

      if (project.isGitRepo) {
        project.currentBranch = await this.getCurrentBranch(this.mainRepoPath);
        project.remoteUrl = await this.getRemoteUrl(this.mainRepoPath);
      }

      return [project];
    } catch (error) {
      logger.error('Error loading projects:', error);
      return [];
    }
  }

  private async isGitRepo(repoPath: string): Promise<boolean> {
    try {
      // Use execFile to prevent command injection
      await execFileAsync('git', ['status'], { 
        cwd: repoPath,
        timeout: 5000  // 5 second timeout
      });
      return true;
    } catch {
      return false;
    }
  }

  private async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      // Use execFile to prevent command injection
      const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { 
        cwd: repoPath,
        timeout: 5000  // 5 second timeout
      });
      return stdout.trim();
    } catch (error) {
      logger.error('Error getting current branch:', error);
      return 'unknown';
    }
  }

  private async getRemoteUrl(repoPath: string): Promise<string> {
    try {
      // Use execFile to prevent command injection
      const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { 
        cwd: repoPath,
        timeout: 5000  // 5 second timeout
      });
      return stdout.trim();
    } catch {
      return '';
    }
  }
}