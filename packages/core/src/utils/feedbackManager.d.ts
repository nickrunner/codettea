interface TaskReview {
    reviewerId: string;
    result: 'APPROVE' | 'REJECT';
    comments: string;
    timestamp: number;
    prNumber?: number;
}
export declare class FeedbackManager {
    /**
     * Generates clean feedback for solver rework attempts.
     * Simply aggregates the most recent round of reviewer feedback without over-processing.
     */
    static generatePreviousFailureFeedback(reviewHistory: TaskReview[], currentAttempt: number): string;
    /**
     * Gets rejected reviews from the most recent review cycle.
     * Handles dynamic reviewer counts by grouping reviews by timestamp proximity.
     */
    private static getRecentRejectedReviews;
    /**
     * Determines if feedback content indicates critical issues requiring rework.
     * Moved from ClaudeAgent to keep feedback logic consolidated.
     */
    static hasReworkRequiredFeedback(reviewResponse: string): boolean;
    static parseReviewResult(reviewResponse: string): 'APPROVE' | 'REJECT';
    static parseReviewComments(reviewResponse: string): string;
}
export {};
//# sourceMappingURL=feedbackManager.d.ts.map