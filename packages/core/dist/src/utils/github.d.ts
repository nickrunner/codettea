export interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    state: string;
}
export interface GitHubPR {
    number: number;
    title: string;
    body: string;
    state: string;
}
export interface PRReview {
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
    author: {
        login: string;
    };
    submittedAt: string;
    body?: string;
}
export interface IssueComment {
    author: {
        login: string;
    };
    body: string;
    createdAt: string;
}
export declare class GitHubUtils {
    static getIssue(issueNumber: number, cwd: string): Promise<GitHubIssue>;
    static createIssue(title: string, body: string, labels: string, project: string, cwd: string): Promise<number>;
    static closeIssue(issueNumber: number, comment: string, cwd: string): Promise<void>;
    static createPR(title: string, body: string, base: string, cwd: string): Promise<number>;
    static updatePR(prNumber: number, title: string, body: string, cwd: string): Promise<void>;
    static listPRs(limit: number, cwd: string): Promise<GitHubPR[]>;
    static searchPRs(search: string, cwd: string): Promise<GitHubPR[]>;
    static findPRForIssue(issueNumber: number, cwd: string): Promise<number | null>;
    static listIssues(label: string, limit: number, cwd: string): Promise<number[]>;
    static parseDependencies(issueBody: string): number[];
    static parseCreatedIssues(response: string): number[];
    static mergePR(prNumber: number, cwd: string, method?: 'merge' | 'squash' | 'rebase'): Promise<void>;
    static deleteBranch(branchName: string, cwd: string, remote?: boolean): Promise<void>;
    static getPR(prNumber: number, cwd: string): Promise<GitHubPR>;
    static getPRBranchName(prNumber: number, cwd: string): Promise<string>;
    static addIssueLabel(issueNumber: number, label: string, cwd: string): Promise<void>;
    static checkAuth(cwd: string): Promise<boolean>;
    static getPRReviews(prNumber: number, cwd: string): Promise<PRReview[]>;
    static getPRComments(prNumber: number, cwd: string): Promise<IssueComment[]>;
    static getAllPRFeedback(prNumber: number, cwd: string): Promise<{
        reviews: PRReview[];
        comments: IssueComment[];
    }>;
    static hasPendingChangeRequests(prNumber: number, cwd: string): Promise<boolean>;
    static submitPRReview(prNumber: number, result: 'APPROVE' | 'REJECT', comments: string, reviewerId: string, reviewerProfile: string, cwd: string): Promise<void>;
}
//# sourceMappingURL=github.d.ts.map