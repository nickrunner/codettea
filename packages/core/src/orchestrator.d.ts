#!/usr/bin/env tsx
interface IssueTask {
    issueNumber: number;
    title: string;
    description: string;
    dependencies: number[];
    requiredReviewers: string[];
    status: 'pending' | 'solving' | 'reviewing' | 'approved' | 'rejected' | 'completed';
    attempts: number;
    maxAttempts: number;
    reviewHistory: TaskReview[];
    worktreePath?: string;
    branch?: string;
    prNumber?: number;
}
interface TaskReview {
    reviewerId: string;
    result: 'APPROVE' | 'REJECT';
    comments: string;
    timestamp: number;
    prNumber?: number;
}
interface FeatureSpec {
    name: string;
    description: string;
    baseBranch: string;
    issues?: number[];
    isParentFeature: boolean;
    architectureMode: boolean;
}
export declare class MultiAgentFeatureOrchestrator {
    private tasks;
    private config;
    private worktreeManager;
    private featureName;
    private projectName;
    private signalHandlersRegistered;
    constructor(config: MultiAgentFeatureOrchestrator['config'], featureName: string, projectName?: string);
    private setupSignalHandlers;
    executeFeature(spec: FeatureSpec): Promise<void>;
    private initializeTasksFromIssues;
    private parseDependencies;
    private parseRequiredReviewers;
    private executeTasks;
    private taskNeedsSolving;
    private executeTask;
    private completeTask;
    private solveTask;
    private getPreviousFailureFeedback;
    private reviewTask;
    private createSharedReviewerPrompt;
    private getReviewFromAgent;
    private getLatestPRNumber;
    private createFeaturePR;
    private buildFeaturePRBody;
    private hasIncompleteTasks;
    private allTasksCompleted;
    private getReadyTasks;
    private architectFeature;
    private loadProfileSpecificContent;
    private createTemporaryPromptFile;
    private convertToReadableTitle;
    private sleep;
}
export { FeatureSpec, IssueTask as FeatureTask };
//# sourceMappingURL=orchestrator.d.ts.map