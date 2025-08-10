export interface ConflictResolution {
    strategy: 'auto' | 'agent' | 'manual';
    action: 'ours' | 'theirs' | 'both' | 'delete' | 'custom' | 'agent-resolve';
    reason: string;
}
export declare class MergeConflictResolver {
    static resolveMergeConflicts(cwd: string, branch: string): Promise<boolean>;
    private static determineResolutionStrategy;
    private static autoResolveConflict;
    static handleMergeConflictError(error: Error, cwd: string, branch: string): Promise<boolean>;
}
//# sourceMappingURL=mergeConflictResolver.d.ts.map