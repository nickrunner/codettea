/**
 * Branch management utilities for git operations
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import {BranchInfo, CleanupOptions, BranchCleanupResult} from './types';

const execAsync = promisify(exec);

/**
 * Default branches that should never be deleted
 */
const PROTECTED_BRANCHES = ['main', 'master', 'dev', 'develop', 'staging'];

/**
 * Gets a list of all local branches
 */
export async function getAllBranches(
  repoPath: string,
): Promise<BranchInfo[]> {
  try {
    const {stdout} = await execAsync('git branch -vv', {cwd: repoPath});
    const branches: BranchInfo[] = [];

    const lines = stdout.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const cleanLine = line.replace(/^\*?\s+/, '');
      const parts = cleanLine.split(/\s+/);

      if (parts.length >= 2) {
        const name = parts[0];
        const lastCommit = parts[1];

        // Check for upstream tracking
        const upstreamMatch = line.match(/\[([^\]]+)\]/);
        let upstream: string | undefined;
        let behind = 0;
        let ahead = 0;

        if (upstreamMatch) {
          const upstreamInfo = upstreamMatch[1];
          upstream = upstreamInfo.split(':')[0];

          const behindMatch = upstreamInfo.match(/behind (\d+)/);
          const aheadMatch = upstreamInfo.match(/ahead (\d+)/);

          if (behindMatch) behind = parseInt(behindMatch[1]);
          if (aheadMatch) ahead = parseInt(aheadMatch[1]);
        }

        branches.push({
          name,
          isCurrent,
          isRemote: false,
          lastCommit,
          upstream,
          behind,
          ahead,
        });
      }
    }

    return branches;
  } catch (error) {
    console.error('Failed to get branch list:', error);
    return [];
  }
}

/**
 * Gets branches that have been merged into a target branch
 */
export async function getMergedBranches(
  targetBranch: string,
  repoPath: string,
): Promise<string[]> {
  try {
    const {stdout} = await execAsync(`git branch --merged ${targetBranch}`, {
      cwd: repoPath,
    });

    return stdout
      .split('\n')
      .map(b => b.trim().replace('* ', ''))
      .filter(b => b && !PROTECTED_BRANCHES.includes(b));
  } catch (error) {
    console.error(`Failed to get branches merged to ${targetBranch}:`, error);
    return [];
  }
}

/**
 * Deletes a list of branches with safety checks
 */
export async function deleteBranches(
  branches: string[],
  repoPath: string,
  options: CleanupOptions = {},
): Promise<BranchCleanupResult> {
  const result: BranchCleanupResult = {
    deleted: [],
    failed: [],
    skipped: [],
    total: branches.length,
  };

  const branchesToDelete = branches.filter(
    branch =>
      !PROTECTED_BRANCHES.includes(branch) &&
      !(options.excludeBranches || []).includes(branch),
  );

  for (const branch of branchesToDelete) {
    try {
      const deleteCommand = options.force
        ? `git branch -D "${branch}"`
        : `git branch -d "${branch}"`;

      if (options.dryRun) {
        console.log(`[DRY RUN] Would delete: ${branch}`);
        result.skipped.push(branch);
      } else {
        await execAsync(deleteCommand, {cwd: repoPath});
        result.deleted.push(branch);
        console.log(`✅ Deleted: ${branch}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!options.force && errorMessage.includes('not fully merged')) {
        result.skipped.push(branch);
        console.log(`⏭️  Skipped unmerged branch: ${branch}`);
      } else {
        result.failed.push(branch);
        console.error(`❌ Failed to delete ${branch}:`, error);
      }
    }
  }

  return result;
}

/**
 * Deletes all branches that have been merged to main or dev
 */
export async function deleteMergedBranches(
  repoPath: string,
  options: CleanupOptions = {},
): Promise<BranchCleanupResult> {
  const mergedToMain = await getMergedBranches('main', repoPath);
  const mergedToDev = await getMergedBranches('dev', repoPath);

  const allMerged = [...new Set([...mergedToMain, ...mergedToDev])];

  if (allMerged.length === 0) {
    return {
      deleted: [],
      failed: [],
      skipped: [],
      total: 0,
    };
  }

  if (!options.skipConfirmation) {
    console.log(`\n🔍 Found ${allMerged.length} merged branches:`);
    allMerged.forEach(branch => console.log(`   • ${branch}`));
  }

  return deleteBranches(allMerged, repoPath, options);
}

/**
 * Interactively delete specific branches
 */
export async function deleteSpecificBranches(
  selectedBranches: string[],
  repoPath: string,
  options: CleanupOptions = {},
): Promise<BranchCleanupResult> {
  return deleteBranches(selectedBranches, repoPath, options);
}

/**
 * Cleans up remote tracking references
 */
export async function cleanupRemoteReferences(
  repoPath: string,
  dryRun = false,
): Promise<string[]> {
  try {
    const command = dryRun
      ? 'git remote prune origin --dry-run'
      : 'git remote prune origin';

    const {stdout} = await execAsync(command, {cwd: repoPath});

    if (stdout.trim()) {
      const pruned = stdout
        .split('\n')
        .filter(line => line.includes('* [would prune]') || line.includes('* [pruned]'))
        .map(line => line.replace(/\s*\*\s*\[(would prune|pruned)\]\s*/, ''));

      return pruned;
    }
    return [];
  } catch (error) {
    console.error('Failed to clean remote references:', error);
    return [];
  }
}

/**
 * Performs a full branch cleanup including merged branches and remote references
 */
export async function fullBranchCleanup(
  repoPath: string,
  options: CleanupOptions = {},
): Promise<{
  branches: BranchCleanupResult;
  remoteRefs: string[];
}> {
  console.log('\n🔄 Starting full branch cleanup...\n');

  // Delete merged branches
  const branches = await deleteMergedBranches(repoPath, options);

  // Clean up remote references
  const remoteRefs = await cleanupRemoteReferences(repoPath, options.dryRun);

  return {branches, remoteRefs};
}

/**
 * Preview what would be deleted without actually deleting
 */
export async function previewCleanup(
  repoPath: string,
): Promise<{
  mergedBranches: string[];
  remoteReferences: string[];
}> {
  const mergedToMain = await getMergedBranches('main', repoPath);
  const mergedToDev = await getMergedBranches('dev', repoPath);
  const mergedBranches = [...new Set([...mergedToMain, ...mergedToDev])];

  const remoteReferences = await cleanupRemoteReferences(repoPath, true);

  return {mergedBranches, remoteReferences};
}

/**
 * Shows comprehensive status of all branches
 */
export async function showAllBranchesStatus(
  repoPath: string,
): Promise<{
  local: BranchInfo[];
  remote: string[];
  current: string;
}> {
  const local = await getAllBranches(repoPath);

  // Get remote branches
  let remote: string[] = [];
  try {
    const {stdout} = await execAsync('git branch -r', {cwd: repoPath});
    remote = stdout
      .split('\n')
      .map(b => b.trim())
      .filter(b => b && !b.includes('HEAD'));
  } catch (error) {
    console.error('Failed to get remote branches:', error);
  }

  // Get current branch
  let current = '';
  try {
    const {stdout} = await execAsync('git branch --show-current', {
      cwd: repoPath,
    });
    current = stdout.trim();
  } catch (error) {
    console.error('Failed to get current branch:', error);
  }

  return {local, remote, current};
}

/**
 * Handles the complete branch cleanup workflow
 */
export async function handleBranchCleanup(
  repoPath: string,
  mode: 'merged' | 'specific' | 'remote' | 'full' | 'preview',
  options: CleanupOptions = {},
  specificBranches?: string[],
): Promise<unknown> {
  switch (mode) {
    case 'merged':
      return deleteMergedBranches(repoPath, options);

    case 'specific':
      if (!specificBranches || specificBranches.length === 0) {
        throw new Error('No branches specified for deletion');
      }
      return deleteSpecificBranches(specificBranches, repoPath, options);

    case 'remote':
      return cleanupRemoteReferences(repoPath, options.dryRun);

    case 'full':
      return fullBranchCleanup(repoPath, options);

    case 'preview':
      return previewCleanup(repoPath);

    default:
      throw new Error(`Unknown cleanup mode: ${mode}`);
  }
}