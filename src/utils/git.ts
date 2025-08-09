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
      // Check if the error is due to uncommitted changes
      if (error.toString().includes('would be overwritten by checkout')) {
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
    await execAsync(`git commit -m ${JSON.stringify(message)}`, {cwd});
  }

  static async merge(branch: string, cwd: string): Promise<void> {
    try {
      await execAsync(`git merge ${branch}`, {cwd});
    } catch (error: any) {
      // Check if this is a merge conflict
      if (error.toString().includes('CONFLICT')) {
        console.log(`⚠️ Merge conflicts detected when merging ${branch}`);
        throw new Error(`MERGE_CONFLICT: ${error.toString()}`);
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
    const strategy =
      resolution === 'ours'
        ? '--ours'
        : resolution === 'theirs'
        ? '--theirs'
        : '--union';
    await execAsync(`git checkout ${strategy} "${filePath}"`, {cwd});
    await execAsync(`git add "${filePath}"`, {cwd});
  }

  static async abortMerge(cwd: string): Promise<void> {
    await execAsync(`git merge --abort`, {cwd});
  }

  static async completeMerge(message: string, cwd: string): Promise<void> {
    await execAsync(`git commit -m ${JSON.stringify(message)}`, {cwd});
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
