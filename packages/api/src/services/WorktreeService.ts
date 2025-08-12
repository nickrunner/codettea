import {
  Worktree,
  CreateWorktreeRequest,
  WorktreeCleanupResult,
} from '../controllers/WorktreeController';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import path from 'path';
import {
  getWorktreeList,
  createWorktree as createWorktreeUtil,
  removeWorktree as removeWorktreeUtil,
  cleanupWorktrees as cleanupWorktreesUtil,
  showWorktreeStatus,
  validateWorktreePath,
  type WorktreeInfo,
} from '@codettea/core';
import {
  getWorktreeStatus,
} from '@codettea/core';

export class WorktreeService {
  private mainRepoPath = process.env.MAIN_REPO_PATH || process.cwd();
  private baseWorktreePath = path.dirname(this.mainRepoPath);

  async getAllWorktrees(): Promise<Worktree[]> {
    try {
      const worktreeInfos = await getWorktreeList(this.mainRepoPath);
      
      const worktrees: Worktree[] = [];
      for (const info of worktreeInfos) {
        const worktree: Worktree = {
          path: info.path,
          branch: info.branch,
          head: info.head,
          isMain: info.isMain,
        };
        
        // Get additional status if not main worktree
        if (!info.isMain) {
          try {
            const status = await getWorktreeStatus(info.path);
            worktree.hasChanges = status.hasChanges;
            worktree.filesChanged = status.filesChanged;
          } catch (error) {
            logger.debug(`Could not get status for worktree ${info.path}:`, error);
          }
        }
        
        worktrees.push(worktree);
      }
      
      return worktrees;
    } catch (error) {
      logger.error('Error loading worktrees:', error);
      return [];
    }
  }

  async createWorktree(request: CreateWorktreeRequest): Promise<Worktree> {
    try {
      // Validate feature name
      if (!request.featureName || request.featureName.trim().length === 0) {
        throw new ValidationError('Feature name is required');
      }
      
      const projectName = path.basename(this.mainRepoPath);
      const worktreePath = path.join(
        this.baseWorktreePath,
        `${projectName}-${request.featureName}`,
      );
      
      // Check if worktree already exists
      const existingWorktrees = await getWorktreeList(this.mainRepoPath);
      if (existingWorktrees.some(w => w.path === worktreePath)) {
        throw new ValidationError(`Worktree for feature ${request.featureName} already exists`);
      }
      
      // Create the worktree
      const branch = request.branch || `feature/${request.featureName}`;
      const baseBranch = request.baseBranch || 'main';
      
      await createWorktreeUtil(
        this.mainRepoPath,
        worktreePath,
        branch,
        baseBranch,
      );
      
      // Get the created worktree info
      const status = await getWorktreeStatus(worktreePath);
      
      return {
        path: worktreePath,
        branch: status.branch,
        head: 'HEAD',
        isMain: false,
        hasChanges: status.hasChanges,
        filesChanged: status.filesChanged,
      };
    } catch (error) {
      logger.error(`Error creating worktree:`, error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create worktree: ${error}`);
    }
  }

  async removeWorktree(worktreePath: string): Promise<void> {
    try {
      // Validate the worktree path
      const validation = await validateWorktreePath(this.mainRepoPath, worktreePath);
      if (!validation.exists) {
        throw new ValidationError(`Worktree at ${worktreePath} does not exist`);
      }
      if (validation.isMain) {
        throw new ValidationError('Cannot remove main worktree');
      }
      
      await removeWorktreeUtil(this.mainRepoPath, worktreePath);
    } catch (error) {
      logger.error(`Error removing worktree at ${worktreePath}:`, error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to remove worktree: ${error}`);
    }
  }

  async cleanupUnusedWorktrees(): Promise<WorktreeCleanupResult> {
    try {
      const result = await cleanupWorktreesUtil(this.mainRepoPath);
      
      return {
        removed: result.removed,
        failed: result.failed,
        message: result.message,
      };
    } catch (error) {
      logger.error('Error cleaning up worktrees:', error);
      return {
        removed: [],
        failed: [],
        message: `Cleanup failed: ${error}`,
      };
    }
  }

  async getWorktreeStatus(worktreePath: string): Promise<Worktree | null> {
    try {
      const worktrees = await getWorktreeList(this.mainRepoPath);
      const worktreeInfo = worktrees.find(w => w.path === worktreePath);
      
      if (!worktreeInfo) {
        return null;
      }
      
      const status = await getWorktreeStatus(worktreePath);
      
      return {
        path: worktreeInfo.path,
        branch: worktreeInfo.branch,
        head: worktreeInfo.head,
        isMain: worktreeInfo.isMain,
        hasChanges: status.hasChanges,
        filesChanged: status.filesChanged,
      };
    } catch (error) {
      logger.error(`Error getting worktree status for ${worktreePath}:`, error);
      return null;
    }
  }
}