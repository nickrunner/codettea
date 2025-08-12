import {
  SystemStatus,
  BranchStatus,
  BranchCleanupRequest,
  BranchCleanupResult,
} from '../controllers/SystemController';
import { logger } from '../utils/logger';
import {
  checkSystemStatus,
  checkClaudeCode,
  testClaudeConnection,
  getClaudeLocation,
  checkGitHubAuth,
  getDefaultBranch,
  getCurrentBranch,
  getWorktrees,
} from '@codettea/core';
import {
  getAllBranches,
  deleteMergedBranches,
  deleteSpecificBranches,
  cleanupRemoteReferences,
  fullBranchCleanup,
  previewCleanup,
} from '@codettea/core';

export class SystemService {
  private mainRepoPath = process.env.MAIN_REPO_PATH || process.cwd();

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const status = await checkSystemStatus(this.mainRepoPath);
      
      // Get worktree information
      const worktrees = await getWorktrees(this.mainRepoPath);
      
      // Get current and default branches
      const currentBranch = await getCurrentBranch(this.mainRepoPath);
      const defaultBranch = await getDefaultBranch(this.mainRepoPath);
      
      return {
        git: {
          installed: status.gitStatus !== 'error',
          version: undefined,
        },
        github: {
          authenticated: status.githubAuthenticated,
          user: undefined,
        },
        claude: {
          available: status.claudeAvailable,
          location: undefined,
        },
        worktrees: {
          count: worktrees.length,
          paths: worktrees.map(w => w.path),
        },
        currentBranch,
        defaultBranch,
      };
    } catch (error) {
      logger.error('Error getting system status:', error);
      throw error;
    }
  }

  async checkClaudeCode(): Promise<{
    available: boolean;
    location?: string;
  }> {
    try {
      const available = await checkClaudeCode();
      const location = available ? await getClaudeLocation() : undefined;
      
      return {
        available,
        location: location || undefined,
      };
    } catch (error) {
      logger.error('Error checking Claude Code:', error);
      return {
        available: false,
      };
    }
  }

  async testConfiguration(): Promise<{
    success: boolean;
    results: Record<string, boolean>;
  }> {
    try {
      const results: Record<string, boolean> = {};
      
      // Test Git
      try {
        const status = await checkSystemStatus(this.mainRepoPath);
        results.git = status.gitStatus !== 'error';
      } catch {
        results.git = false;
      }
      
      // Test GitHub
      try {
        results.github = await checkGitHubAuth(this.mainRepoPath);
      } catch {
        results.github = false;
      }
      
      // Test Claude Code
      try {
        results.claude = await checkClaudeCode();
        if (results.claude) {
          results.claudeConnection = await testClaudeConnection(this.mainRepoPath);
        } else {
          results.claudeConnection = false;
        }
      } catch {
        results.claude = false;
        results.claudeConnection = false;
      }
      
      // Test worktree access
      try {
        const worktrees = await getWorktrees(this.mainRepoPath);
        results.worktrees = true;
        results.worktreeCount = worktrees.length > 0;
      } catch {
        results.worktrees = false;
        results.worktreeCount = false;
      }
      
      const success = Object.values(results).every(v => v === true);
      
      return {
        success,
        results,
      };
    } catch (error) {
      logger.error('Error testing configuration:', error);
      return {
        success: false,
        results: {
          error: false,
        },
      };
    }
  }

  async getAllBranchesStatus(): Promise<BranchStatus[]> {
    try {
      const branches = await getAllBranches(this.mainRepoPath);
      
      return branches.map(branch => ({
        name: branch.name,
        isLocal: !branch.isRemote,
        isRemote: branch.isRemote,
        isCurrent: branch.isCurrent,
        isMerged: branch.isMerged,
        lastCommit: branch.lastCommit,
      }));
    } catch (error) {
      logger.error('Error getting branches status:', error);
      return [];
    }
  }

  async cleanupBranches(request: BranchCleanupRequest): Promise<BranchCleanupResult> {
    try {
      let result: {
        deleted: string[];
        failed: string[];
        message: string;
      };
      
      if (request.dryRun) {
        // Preview what would be deleted
        const preview = await previewCleanup(this.mainRepoPath);
        return {
          deleted: [],
          failed: [],
          skipped: preview.mergedBranches.concat(preview.remoteReferences),
          message: `Dry run: Would delete ${preview.mergedBranches.length} branches and ${preview.remoteReferences.length} remote references`,
        };
      }
      
      if (request.branches && request.branches.length > 0) {
        // Delete specific branches
        const deleteResult = await deleteSpecificBranches(request.branches, this.mainRepoPath);
        result = {
          deleted: deleteResult.deleted,
          failed: deleteResult.failed,
          message: `Deleted ${deleteResult.deleted.length} branches`,
        };
      } else if (request.deleteMerged) {
        // Delete merged branches
        const mergedResult = await deleteMergedBranches(this.mainRepoPath);
        result = {
          deleted: mergedResult.deleted,
          failed: mergedResult.failed,
          message: `Deleted ${mergedResult.deleted.length} merged branches`,
        };
      } else if (request.deleteRemote) {
        // Cleanup remote references
        const remoteResult = await cleanupRemoteReferences(this.mainRepoPath);
        result = {
          deleted: remoteResult,
          failed: [],
          message: `Cleaned up ${remoteResult.length} remote references`,
        };
      } else {
        // Full cleanup
        const fullResult = await fullBranchCleanup(this.mainRepoPath);
        result = {
          deleted: fullResult.branches.deleted.concat(fullResult.remoteRefs),
          failed: fullResult.branches.failed,
          message: `Full cleanup: deleted ${fullResult.branches.deleted.length} branches and ${fullResult.remoteRefs.length} remote references`,
        };
      }
      
      return {
        deleted: result.deleted,
        failed: result.failed,
        skipped: [],
        message: result.message,
      };
    } catch (error) {
      logger.error('Error cleaning up branches:', error);
      return {
        deleted: [],
        failed: [],
        skipped: [],
        message: `Cleanup failed: ${error}`,
      };
    }
  }
}