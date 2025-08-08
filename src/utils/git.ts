import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class GitUtils {
  static async checkout(branch: string, cwd: string): Promise<void> {
    await execAsync(`git checkout ${branch}`, {cwd});
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
    await execAsync(`git merge ${branch}`, {cwd});
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