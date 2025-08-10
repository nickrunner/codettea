import { Project } from '../controllers/ProjectsController';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class ProjectsService {
  private mainRepoPath = process.env.MAIN_REPO_PATH || process.cwd();

  async getAllProjects(): Promise<Project[]> {
    try {
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
      await execAsync('git status', { cwd: repoPath });
      return true;
    } catch {
      return false;
    }
  }

  private async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
      return stdout.trim();
    } catch (error) {
      logger.error('Error getting current branch:', error);
      return 'unknown';
    }
  }

  private async getRemoteUrl(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: repoPath });
      return stdout.trim();
    } catch {
      return '';
    }
  }
}