import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class GitUtils {
  static async checkout(branch: string, cwd: string): Promise<void> {
    await execAsync(`git checkout ${branch}`, {cwd});
  }

  static async safeCheckout(branch: string, cwd: string): Promise<void> {
    try {
      await execAsync(`git checkout ${branch}`, {cwd});
    } catch (error: any) {
      const errorStr = error.toString();

      // Check if repository is in a conflicted state
      if (
        errorStr.includes('you need to resolve your current index first') ||
        errorStr.includes('needs merge')
      ) {
        console.log(
          `⚠️ Repository has unresolved conflicts, attempting to resolve before checkout`,
        );

        try {
          // Import the resolver here to avoid circular imports
          const {MergeConflictResolver} = require('./mergeConflictResolver');
          const resolved = await MergeConflictResolver.resolveMergeConflicts(
            cwd,
            'auto-cleanup',
          );

          if (resolved) {
            console.log(`✅ Conflicts resolved, retrying checkout`);
            await execAsync(`git checkout ${branch}`, {cwd});
            return;
          } else {
            // If auto-resolution fails, abort the merge and retry
            console.log(`⚠️ Auto-resolution failed, aborting merge state`);
            await GitUtils.abortMerge(cwd);
            await execAsync(`git checkout ${branch}`, {cwd});
            return;
          }
        } catch (resolveError) {
          console.error(`❌ Failed to resolve conflicts: ${resolveError}`);
          throw new Error(
            `Cannot checkout ${branch}: repository has unresolved conflicts that could not be auto-resolved`,
          );
        }
      }

      // Check if the error is due to uncommitted changes
      if (errorStr.includes('would be overwritten by checkout')) {
        console.log(
          `⚠️ Uncommitted changes detected, stashing before checkout`,
        );

        // Stash changes temporarily
        await execAsync(`git stash push -m "Auto-stash before branch switch"`, {
          cwd,
        });

        // Now checkout should work
        await execAsync(`git checkout ${branch}`, {cwd});

        // Try to restore stashed changes
        try {
          await execAsync(`git stash pop`, {cwd});
          console.log(`✅ Restored stashed changes after checkout`);
        } catch (stashError) {
          console.log(`⚠️ Could not restore stash: ${stashError}`);
          console.log(`💡 Changes are safely stashed, check 'git stash list'`);
        }
      } else {
        throw error;
      }
    }
  }

  static async pull(branch: string, cwd: string): Promise<void> {
    await execAsync(`git pull origin ${branch}`, {cwd});
  }

  static async createBranch(branch: string, cwd: string): Promise<void> {
    await execAsync(`git checkout -b ${branch}`, {cwd});
  }

  static async push(branch: string, cwd: string): Promise<void> {
    await execAsync(`git push -u origin ${branch}`, {cwd});
  }

  static async branchExists(branch: string, cwd: string): Promise<boolean> {
    try {
      const {stdout} = await execAsync(`git branch --list ${branch}`, {cwd});
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  static async getCurrentBranch(cwd: string): Promise<string> {
    const {stdout} = await execAsync('git branch --show-current', {cwd});
    return stdout.trim();
  }

  static async addWorktree(
    worktreePath: string,
    branch: string,
    cwd: string,
  ): Promise<void> {
    await execAsync(`git worktree add ${worktreePath} ${branch}`, {cwd});
  }

  static async listWorktrees(cwd: string): Promise<string> {
    const {stdout} = await execAsync('git worktree list --porcelain', {cwd});
    return stdout;
  }

  static async isBranchInWorktree(
    branchName: string,
    cwd: string,
  ): Promise<boolean> {
    try {
      const stdout = await GitUtils.listWorktrees(cwd);
      const worktrees = stdout.trim().split('\n\n');

      for (const worktree of worktrees) {
        const lines = worktree.split('\n');
        for (const line of lines) {
          if (line.startsWith('branch refs/heads/')) {
            const branch = line.replace('branch refs/heads/', '');
            if (branch === branchName) {
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  static async addFiles(pattern: string, cwd: string): Promise<void> {
    await execAsync(`git add ${pattern}`, {cwd});
  }

  static async commit(message: string, cwd: string): Promise<void> {
    try {
      await execAsync(`git commit -m ${JSON.stringify(message)}`, {cwd});
    } catch (error: any) {
      const errorStr = error.toString();
      if (
        errorStr.includes('nothing to commit') ||
        (error.stdout &&
          error.stdout.toString().includes('nothing to commit')) ||
        (error.stderr && error.stderr.toString().includes('nothing to commit'))
      ) {
        console.log(`⚠️ No changes to commit - skipping commit`);
      } else {
        throw error;
      }
    }
  }

  static async merge(branch: string, cwd: string): Promise<void> {
    try {
      await execAsync(`git merge ${branch}`, {cwd});
    } catch (error: any) {
      const errorStr = error.toString();
      const stdout = error.stdout || '';
      const stderr = error.stderr || '';

      // Check if repository is in a partial merge state
      if (
        errorStr.includes('unmerged files') ||
        errorStr.includes('Merging is not possible')
      ) {
        console.log(`⚠️ Repository is in partial merge state - cleaning up`);
        throw new Error(`PARTIAL_MERGE_STATE: ${errorStr}`);
      }

      // Check if this is a new merge conflict (check both stdout and error message)
      if (
        errorStr.includes('CONFLICT') ||
        stdout.includes('CONFLICT') ||
        stderr.includes('CONFLICT') ||
        errorStr.includes('Automatic merge failed') ||
        stdout.includes('Automatic merge failed')
      ) {
        console.log(`⚠️ Merge conflicts detected when merging ${branch}`);
        throw new Error(`MERGE_CONFLICT: ${errorStr}`);
      }

      throw error;
    }
  }

  static async getMergeConflictFiles(cwd: string): Promise<string[]> {
    try {
      const {stdout} = await execAsync(`git diff --name-only --diff-filter=U`, {
        cwd,
      });
      return stdout
        .trim()
        .split('\n')
        .filter(line => line.trim());
    } catch (error) {
      console.log(`⚠️ Could not get conflict files: ${error}`);
      return [];
    }
  }

  static async resolveMergeConflict(
    filePath: string,
    resolution: 'ours' | 'theirs' | 'both',
    cwd: string,
  ): Promise<void> {
    if (resolution === 'ours') {
      await execAsync(`git checkout --ours "${filePath}"`, {cwd});
    } else if (resolution === 'theirs') {
      await execAsync(`git checkout --theirs "${filePath}"`, {cwd});
    } else if (resolution === 'both') {
      // For 'both', we need to use git merge-file with union strategy
      // First, let's try a simpler approach using git show to get both versions
      try {
        const {stdout: oursContent} = await execAsync(
          `git show :2:"${filePath}"`,
          {cwd},
        );
        const {stdout: theirsContent} = await execAsync(
          `git show :3:"${filePath}"`,
          {cwd},
        );

        // Simple concatenation for documentation files
        const mergedContent = `${oursContent}\n\n${theirsContent}`;

        // Write the merged content back to the file
        await execAsync(
          `echo ${JSON.stringify(mergedContent)} > "${filePath}"`,
          {cwd},
        );
      } catch (showError) {
        // Fallback to just taking theirs if the advanced merge fails
        console.log(
          `⚠️ Advanced merge failed, falling back to 'theirs': ${showError}`,
        );
        await execAsync(`git checkout --theirs "${filePath}"`, {cwd});
      }
    }

    await execAsync(`git add "${filePath}"`, {cwd});
  }

  static async abortMerge(cwd: string): Promise<void> {
    await execAsync(`git merge --abort`, {cwd});
  }

  static async completeMerge(message: string, cwd: string): Promise<void> {
    await execAsync(`git commit -m ${JSON.stringify(message)}`, {cwd});
  }

  static async resetIndex(cwd: string): Promise<void> {
    await execAsync(`git reset --mixed HEAD`, {cwd});
  }

  static async status(cwd: string): Promise<void> {
    await execAsync('git status', {cwd});
  }

  static async verifyBranch(branch: string, cwd: string): Promise<boolean> {
    try {
      await execAsync(`git rev-parse --verify ${branch}`, {cwd});
      return true;
    } catch {
      return false;
    }
  }

  static async worktreeExists(worktreePath: string): Promise<boolean> {
    try {
      await fs.access(worktreePath);
      return true;
    } catch {
      return false;
    }
  }
}
