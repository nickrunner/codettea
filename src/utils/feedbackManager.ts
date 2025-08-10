// No imports needed - self-contained feedback management

interface TaskReview {
  reviewerId: string;
  result: 'APPROVE' | 'REJECT';
  comments: string;
  timestamp: number;
  prNumber?: number;
}

interface ActionItem {
  priority: 'critical' | 'normal';
  action: string;
  author: string;
}

export class FeedbackManager {
  /**
   * Generates concise, non-bloated feedback for solver rework attempts
   * by filtering to recent reviews and extracting specific action items.
   */
  static generatePreviousFailureFeedback(
    reviewHistory: TaskReview[],
    currentAttempt: number,
  ): string {
    // Only get feedback from recent reviews to avoid bloat
    const recentRejectedReviews = this.getRecentRejectedReviews(
      reviewHistory,
      currentAttempt,
    );

    if (recentRejectedReviews.length === 0) {
      return 'No recent failure feedback available.';
    }

    // Extract and deduplicate key action items
    const actionItems = this.extractActionItems(recentRejectedReviews);

    if (actionItems.length === 0) {
      return 'Previous reviewers provided feedback but no specific action items were identified.';
    }

    // Format as concise, actionable feedback
    const feedback = this.formatConciseFeedback(actionItems, currentAttempt);

    return feedback;
  }

  /**
   * Gets rejected reviews from recent attempts, avoiding accumulation of old feedback.
   * Uses timestamp-based filtering since we don't have explicit attempt tracking.
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

    // If we have multiple attempts, only use reviews from the most recent cycle
    if (currentAttempt > 1 && rejectedReviews.length > 3) {
      // Use timestamp to get most recent reviews (last 3 rejected reviews)
      return rejectedReviews
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
    }

    // For first attempt or few reviews, use all rejected reviews
    return rejectedReviews;
  }

  /**
   * Extracts specific actionable items from review comments using pattern matching.
   * Deduplicates similar actions to avoid bloat.
   */
  private static extractActionItems(reviews: TaskReview[]): ActionItem[] {
    const items: ActionItem[] = [];
    const seenActions = new Set<string>();

    for (const review of reviews) {
      const content = review.comments || '';
      const author = review.reviewerId || 'unknown';

      // Extract specific action items using common patterns
      const actionPatterns = [
        /(?:must|need to|should|fix|add|remove|update|implement|ensure)\s+([^.!?\n]+)/gi,
        /(?:missing|lacks|requires?)\s+([^.!?\n]+)/gi,
        /(?:error|issue|problem):\s*([^.!?\n]+)/gi,
      ];

      for (const pattern of actionPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const action = match[1]?.trim();
          if (action && action.length > 10 && action.length < 200) {
            // Simple deduplication based on semantic similarity
            const normalizedAction = action.toLowerCase().replace(/\s+/g, ' ');
            if (!seenActions.has(normalizedAction)) {
              seenActions.add(normalizedAction);

              const isCritical = this.hasReworkRequiredFeedback(content);
              items.push({
                priority: isCritical ? 'critical' : 'normal',
                action: action,
                author: author,
              });
            }
          }
        }
      }
    }

    // Sort by priority and limit to most important items
    return items
      .sort((a, b) => (a.priority === 'critical' ? -1 : 1))
      .slice(0, 5); // Maximum 5 action items
  }

  /**
   * Formats action items into concise, prioritized feedback.
   */
  private static formatConciseFeedback(
    actionItems: ActionItem[],
    attemptNumber: number,
  ): string {
    let feedback = `⚠️ **REWORK REQUIRED (Attempt ${attemptNumber})** - Address these key issues:\n\n`;

    const criticalItems = actionItems.filter(
      item => item.priority === 'critical',
    );
    const normalItems = actionItems.filter(item => item.priority === 'normal');

    if (criticalItems.length > 0) {
      feedback += '🔴 **Critical Issues:**\n';
      criticalItems.forEach((item, index) => {
        feedback += `${index + 1}. ${item.action} _(${item.author})_\n`;
      });
      feedback += '\n';
    }

    if (normalItems.length > 0) {
      feedback += '📝 **Additional Feedback:**\n';
      normalItems.forEach((item, index) => {
        feedback += `${index + 1}. ${item.action} _(${item.author})_\n`;
      });
      feedback += '\n';
    }

    feedback +=
      'Focus on critical issues first. Test thoroughly before re-submitting.';

    return feedback;
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
