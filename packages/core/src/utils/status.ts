import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import {ClaudeAgent} from './claude';
import {GitHubUtils} from './github';

const execAsync = promisify(exec);

export interface SystemStatus {
  claudeAvailable: boolean;
  gitStatus: 'clean' | 'uncommitted' | 'error';
  githubAuthenticated: boolean;
  worktreeCount: number;
  currentBranch: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
}

/**
 * Check overall system status
 */
export async function checkSystemStatus(mainRepoPath: string): Promise<SystemStatus> {
  const claudeAvailable = await ClaudeAgent.checkAvailability();
  const gitStatus = await checkGitStatus(mainRepoPath);
  const githubAuthenticated = await GitHubUtils.checkAuth(mainRepoPath);
  const worktrees = await getWorktrees(mainRepoPath);
  const currentBranch = await getCurrentBranch(mainRepoPath);

  return {
    claudeAvailable,
    gitStatus,
    githubAuthenticated,
    worktreeCount: worktrees.length,
    currentBranch,
  };
}

/**
 * Check git repository status
 */
export async function checkGitStatus(
  repoPath: string,
): Promise<'clean' | 'uncommitted' | 'error'> {
  try {
    const {stdout: gitStatus} = await execAsync('git status --porcelain', {
      cwd: repoPath,
    });
    return gitStatus.trim() ? 'uncommitted' : 'clean';
  } catch {
    return 'error';
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const {stdout} = await execAsync('git branch --show-current', {
      cwd: repoPath,
    });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get list of worktrees
 */
export async function getWorktrees(mainRepoPath: string): Promise<WorktreeInfo[]> {
  try {
    const {stdout} = await execAsync('git worktree list', {
      cwd: mainRepoPath,
    });

    const lines = stdout.trim().split('\n');
    return lines.map(line => {
      const parts = line.split(/\s+/);
      return {
        path: parts[0],
        branch: parts[1] || 'detached',
        isMain: parts[0] === mainRepoPath,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get worktree status for a specific path
 */
export async function getWorktreeStatus(worktreePath: string): Promise<{
  branch: string;
  hasChanges: boolean;
  recentCommits: string[];
} | null> {
  try {
    const {stdout: status} = await execAsync('git status --short', {
      cwd: worktreePath,
    });
    const {stdout: branch} = await execAsync('git branch --show-current', {
      cwd: worktreePath,
    });
    const {stdout: log} = await execAsync('git log --oneline -5', {
      cwd: worktreePath,
    });

    return {
      branch: branch.trim(),
      hasChanges: status.trim().length > 0,
      recentCommits: log.trim().split('\n').filter(line => line),
    };
  } catch {
    return null;
  }
}

/**
 * Check if Claude Code is available
 */
export async function checkClaudeCode(): Promise<boolean> {
  return await ClaudeAgent.checkAvailability();
}

/**
 * Test Claude Code connection
 */
export async function testClaudeConnection(mainRepoPath: string): Promise<boolean> {
  return await ClaudeAgent.testConnection(mainRepoPath);
}

/**
 * Get Claude Code location
 */
export async function getClaudeLocation(): Promise<string | null> {
  try {
    const {stdout} = await execAsync('which claude');
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check GitHub authentication
 */
export async function checkGitHubAuth(mainRepoPath: string): Promise<boolean> {
  return await GitHubUtils.checkAuth(mainRepoPath);
}

/**
 * Get default branch for repository
 */
export async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    // Try to get the default branch from remote
    const {stdout} = await execAsync(
      'git symbolic-ref refs/remotes/origin/HEAD',
      {cwd: repoPath},
    );
    return stdout.trim().replace('refs/remotes/origin/', '');
  } catch {
    // Fallback: check for common default branches
    try {
      const {stdout} = await execAsync('git branch -r', {cwd: repoPath});
      const branches = stdout.toLowerCase();
      
      if (branches.includes('origin/main')) {
        return 'main';
      } else if (branches.includes('origin/master')) {
        return 'master';
      }
    } catch {
      // Failed to get branches
    }
    
    // Ultimate fallback
    return 'main';
  }
}

/**
 * Check if a path exists and is accessible
 */
export async function checkPathAccess(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format system status for display
 */
export function formatSystemStatus(status: SystemStatus): string {
  const lines = [
    `Claude Code: ${status.claudeAvailable ? '✅ Available' : '❌ Not Found'}`,
    `Git Status: ${
      status.gitStatus === 'clean'
        ? '✅ Clean'
        : status.gitStatus === 'uncommitted'
        ? '⚠️  Uncommitted changes'
        : '❌ Error checking status'
    }`,
    `GitHub: ${status.githubAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}`,
    `Worktrees: ${status.worktreeCount} active`,
    `Current Branch: ${status.currentBranch}`,
  ];
  
  return lines.join('\n');
}