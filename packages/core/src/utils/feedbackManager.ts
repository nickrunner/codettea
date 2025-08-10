// No imports needed - self-contained feedback management

interface TaskReview {
  reviewerId: string;
  result: 'APPROVE' | 'REJECT';
  comments: string;
  timestamp: number;
  prNumber?: number;
}


export class FeedbackManager {
  /**
   * Generates clean feedback for solver rework attempts.
   * Simply aggregates the most recent round of reviewer feedback without over-processing.
   */
  static generatePreviousFailureFeedback(
    reviewHistory: TaskReview[],
    currentAttempt: number,
  ): string {
    // Get the most recent round of rejected reviews 
    const recentRejectedReviews = this.getRecentRejectedReviews(
      reviewHistory,
      currentAttempt,
    );

    if (recentRejectedReviews.length === 0) {
      return 'No previous attempts - this is the first implementation attempt.';
    }

    // Simply aggregate the feedback without heavy processing
    let feedback = `## Previous Review Feedback (Attempt ${currentAttempt})\n\n`;
    
    recentRejectedReviews.forEach((review, index) => {
      feedback += `### Reviewer ${index + 1} (${review.reviewerId})\n`;
      feedback += `${review.comments}\n\n`;
    });

    feedback += `**Please address the above feedback and re-implement accordingly.**`;

    return feedback;
  }

  /**
   * Gets rejected reviews from the most recent review cycle.
   * Handles dynamic reviewer counts by grouping reviews by timestamp proximity.
   */
  private static getRecentRejectedReviews(
    reviewHistory: TaskReview[],
    currentAttempt: number,
  ): TaskReview[] {
    const rejectedReviews = reviewHistory.filter(
      review => review.result === 'REJECT',
    );

    if (rejectedReviews.length === 0) {
      return [];
    }

    // Sort by timestamp (most recent first)
    const sortedReviews = rejectedReviews.sort((a, b) => b.timestamp - a.timestamp);

    // For first attempt, return all rejected reviews from this round
    if (currentAttempt <= 1) {
      return sortedReviews;
    }

    // For subsequent attempts, get the most recent "batch" of reviews
    // Reviews within 5 minutes of each other are considered the same round
    const mostRecentTimestamp = sortedReviews[0].timestamp;
    const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    const recentRound = sortedReviews.filter(
      review => (mostRecentTimestamp - review.timestamp) <= timeWindow
    );

    return recentRound;
  }


  /**
   * Determines if feedback content indicates critical issues requiring rework.
   * Moved from ClaudeAgent to keep feedback logic consolidated.
   */
  public static hasReworkRequiredFeedback(reviewResponse: string): boolean {
    // Look for the explicit rework marker
    if (reviewResponse.includes('**REWORK_REQUIRED**')) {
      return true;
    }

    // Also check for explicit REJECT marker as indicator of rework needed
    if (reviewResponse.includes('❌ REJECT')) {
      return true;
    }

    // Fallback for backwards compatibility
    const response = reviewResponse.toLowerCase();
    return (
      response.includes('must fix') ||
      response.includes('critical issues') ||
      response.includes('action items')
    );
  }

  static parseReviewResult(reviewResponse: string): 'APPROVE' | 'REJECT' {
    // Check if both markers are present - this indicates an error in the review
    const hasApprove = reviewResponse.includes('✅ APPROVE');
    const hasReject = reviewResponse.includes('❌ REJECT');

    if (hasApprove && hasReject) {
      console.log(
        `⚠️ Both APPROVE and REJECT markers found - this is invalid, defaulting to REJECT`,
      );
      return 'REJECT';
    }

    // Look for explicit markers first
    if (hasApprove) {
      console.log(`✅ Explicit APPROVE marker found`);
      return 'APPROVE';
    }

    if (hasReject) {
      console.log(`❌ Explicit REJECT marker found`);
      return 'REJECT';
    }

    // Fallback to basic text detection for backwards compatibility
    const response = reviewResponse.toLowerCase();

    if (response.includes('approve') || response.includes('✅')) {
      console.log(`✅ Approval language detected`);
      return 'APPROVE';
    }

    if (response.includes('reject') || response.includes('❌')) {
      console.log(`❌ Rejection language detected`);
      return 'REJECT';
    }

    // Default to reject if unclear
    console.log(`❓ Unclear review result - defaulting to REJECT for safety`);
    return 'REJECT';
  }

  static parseReviewComments(reviewResponse: string): string {
    const lines = reviewResponse.split('\n');
    const filteredLines = lines.filter(
      line => line.trim() && !line.includes('claude') && !line.includes('🤖'),
    );
    return filteredLines.join('\n').trim();
  }
}
