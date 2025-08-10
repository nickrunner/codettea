export declare class GitUtils {
    static checkout(branch: string, cwd: string): Promise<void>;
    static safeCheckout(branch: string, cwd: string): Promise<void>;
    static pull(branch: string, cwd: string): Promise<void>;
    static createBranch(branch: string, cwd: string): Promise<void>;
    static push(branch: string, cwd: string): Promise<void>;
    static branchExists(branch: string, cwd: string): Promise<boolean>;
    static getCurrentBranch(cwd: string): Promise<string>;
    static addWorktree(worktreePath: string, branch: string, cwd: string): Promise<void>;
    static listWorktrees(cwd: string): Promise<string>;
    static isBranchInWorktree(branchName: string, cwd: string): Promise<boolean>;
    static addFiles(pattern: string, cwd: string): Promise<void>;
    static commit(message: string, cwd: string): Promise<void>;
    static merge(branch: string, cwd: string): Promise<void>;
    static getMergeConflictFiles(cwd: string): Promise<string[]>;
    static resolveMergeConflict(filePath: string, resolution: 'ours' | 'theirs' | 'both', cwd: string): Promise<void>;
    static abortMerge(cwd: string): Promise<void>;
    static completeMerge(message: string, cwd: string): Promise<void>;
    static resetIndex(cwd: string): Promise<void>;
    static status(cwd: string): Promise<void>;
    static verifyBranch(branch: string, cwd: string): Promise<boolean>;
    static worktreeExists(worktreePath: string): Promise<boolean>;
}
//# sourceMappingURL=git.d.ts.map