import { FeedbackManager } from '../../src/utils/feedbackManager';

describe('FeedbackManager', () => {
  describe('generatePreviousFailureFeedback', () => {
    it('should return no feedback message when no rejected reviews', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'APPROVE' as const,
          comments: 'Looks good!',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 2);
      expect(result).toBe('No recent failure feedback available.');
    });

    it('should return no action items message when no extractable actions', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'This is not good. Very bad. Terrible work.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 2);
      expect(result).toBe('Previous reviewers provided feedback but no specific action items were identified.');
    });

    it('should extract and format critical action items', () => {
      const reviewHistory = [
        {
          reviewerId: 'frontend-reviewer',
          result: 'REJECT' as const,
          comments: '**REWORK_REQUIRED** You must fix the TypeScript errors in the component. Need to add proper validation.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 2);
      
      expect(result).toContain('⚠️ **REWORK REQUIRED (Attempt 2)**');
      expect(result).toContain('🔴 **Critical Issues:**');
      expect(result).toContain('fix the TypeScript errors in the component');
      expect(result).toContain('add proper validation');
      expect(result).toContain('_(frontend-reviewer)_');
    });

    it('should extract and format normal action items', () => {
      const reviewHistory = [
        {
          reviewerId: 'backend-reviewer',
          result: 'REJECT' as const,
          comments: 'You should update the documentation for this API endpoint. Consider adding unit tests.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 3);
      
      expect(result).toContain('⚠️ **REWORK REQUIRED (Attempt 3)**');
      expect(result).toContain('📝 **Additional Feedback:**');
      expect(result).toContain('update the documentation for this API endpoint');
      expect(result).toContain('_(backend-reviewer)_');
    });

    it('should mix critical and normal feedback correctly', () => {
      const reviewHistory = [
        {
          reviewerId: 'critical-reviewer',
          result: 'REJECT' as const,
          comments: '**REWORK_REQUIRED** Must fix security vulnerability immediately.',
          timestamp: Date.now(),
        },
        {
          reviewerId: 'normal-reviewer', 
          result: 'REJECT' as const,
          comments: 'You should also improve the documentation for better clarity.',
          timestamp: Date.now() - 1000,
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      
      expect(result).toContain('🔴 **Critical Issues:**');
      expect(result).toContain('📝 **Additional Feedback:**');
      expect(result).toContain('fix security vulnerability');
      expect(result).toContain('improve the documentation');
    });

    it('should limit to 5 action items maximum', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'You must fix error 1. Need to fix error 2. Should fix error 3. Must fix error 4. Need to fix error 5. Should fix error 6. Must fix error 7.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      
      // Count the number of numbered items (1., 2., 3., etc.)
      const numberedItems = (result.match(/^\d+\./gm) || []).length;
      expect(numberedItems).toBeLessThanOrEqual(5);
    });

    it('should deduplicate similar actions', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'You must fix database connection issues. Need to fix database connection issues.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      
      // Should only extract one action item due to exact deduplication
      const numberedItems = (result.match(/^\d+\./gm) || []).length;
      expect(numberedItems).toBe(1);
    });

    it('should prioritize recent reviews for multiple attempts', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'Old feedback: fix old issue.',
          timestamp: Date.now() - 10000, // Older timestamp
        },
        {
          reviewerId: 'reviewer-2',
          result: 'REJECT' as const,
          comments: 'Recent feedback: must fix new critical issue.',
          timestamp: Date.now(), // Recent timestamp
        },
        {
          reviewerId: 'reviewer-3',
          result: 'REJECT' as const,
          comments: 'Another recent: need to add validation.',
          timestamp: Date.now() - 1000,
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 3);
      
      // Should contain recent feedback
      expect(result).toContain('fix new critical issue');
      expect(result).toContain('add validation');
    });

    it('should filter out very short or very long actions', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: `You must fix it. Need to ${' fix this very long action item that goes on and on and on and exceeds the 200 character limit for action items because it contains too much detail and should be filtered out as it would bloat the feedback message'.repeat(2)}.`,
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      
      // Should not contain the very short "fix it" or very long action
      expect(result).not.toContain('fix it');
      expect(result).toBe('Previous reviewers provided feedback but no specific action items were identified.');
    });
  });

  describe('hasReworkRequiredFeedback', () => {
    it('should detect explicit rework marker', () => {
      const feedback = 'This needs changes. **REWORK_REQUIRED**';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(true);
    });

    it('should detect explicit reject marker', () => {
      const feedback = 'Analysis complete: ❌ REJECT due to issues';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(true);
    });

    it('should detect "must fix" language', () => {
      const feedback = 'You must fix these TypeScript errors immediately';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(true);
    });

    it('should detect "critical issues" language', () => {
      const feedback = 'Found several critical issues in the implementation';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(true);
    });

    it('should detect "action items" language', () => {
      const feedback = 'Here are the action items that need attention';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(true);
    });

    it('should return false for normal feedback', () => {
      const feedback = 'Good work overall, just some minor suggestions for improvement';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(false);
    });

    it('should be case insensitive for fallback detection', () => {
      const feedback = 'You MUST FIX these CRITICAL ISSUES with ACTION ITEMS';
      expect(FeedbackManager.hasReworkRequiredFeedback(feedback)).toBe(true);
    });
  });

  describe('parseReviewResult', () => {
    it('should parse explicit approve marker', () => {
      const response = 'Looking good! ✅ APPROVE this change';
      expect(FeedbackManager.parseReviewResult(response)).toBe('APPROVE');
    });

    it('should parse explicit reject marker', () => {
      const response = 'Found issues. ❌ REJECT this PR';
      expect(FeedbackManager.parseReviewResult(response)).toBe('REJECT');
    });

    it('should handle both markers present by defaulting to reject', () => {
      const response = 'Mixed signals: ✅ APPROVE but also ❌ REJECT';
      expect(FeedbackManager.parseReviewResult(response)).toBe('REJECT');
    });

    it('should fallback to approve detection', () => {
      const response = 'I approve this change ✅';
      expect(FeedbackManager.parseReviewResult(response)).toBe('APPROVE');
    });

    it('should fallback to reject detection', () => {
      const response = 'I reject this implementation ❌';
      expect(FeedbackManager.parseReviewResult(response)).toBe('REJECT');
    });

    it('should default to reject when unclear', () => {
      const response = 'This is a neutral comment without clear direction';
      expect(FeedbackManager.parseReviewResult(response)).toBe('REJECT');
    });

    it('should be case insensitive', () => {
      const response = 'APPROVE THIS CHANGE';
      expect(FeedbackManager.parseReviewResult(response)).toBe('APPROVE');
    });
  });

  describe('parseReviewComments', () => {
    it('should return clean comments without claude references', () => {
      const response = `Great work on this PR!
        This looks good to me.
        - claude thinks this is good
        - 🤖 generated response
        Final thoughts: approved`;

      const result = FeedbackManager.parseReviewComments(response);
      
      expect(result).toContain('Great work on this PR!');
      expect(result).toContain('This looks good to me.');
      expect(result).toContain('Final thoughts: approved');
      expect(result).not.toContain('claude thinks');
      expect(result).not.toContain('🤖 generated');
    });

    it('should handle empty lines correctly', () => {
      const response = `Line 1
        
        
        Line 2
        
        Line 3`;

      const result = FeedbackManager.parseReviewComments(response);
      const lines = result.split('\n');
      
      // Should not have empty lines after filtering
      expect(lines.every(line => line.trim().length > 0)).toBe(true);
    });

    it('should return empty string for comments with only claude references', () => {
      const response = `claude generated this
        🤖 automated response
        claude thinks about this`;

      const result = FeedbackManager.parseReviewComments(response);
      expect(result).toBe('');
    });
  });

  describe('edge cases and integration', () => {
    it('should handle empty review history gracefully', () => {
      const result = FeedbackManager.generatePreviousFailureFeedback([], 1);
      expect(result).toBe('No recent failure feedback available.');
    });

    it('should handle review without comments', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: '',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      expect(result).toBe('Previous reviewers provided feedback but no specific action items were identified.');
    });

    it('should handle undefined/null comments gracefully', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: null as any,
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      expect(result).toBe('Previous reviewers provided feedback but no specific action items were identified.');
    });

    it('should handle missing reviewerId gracefully', () => {
      const reviewHistory = [
        {
          reviewerId: '',
          result: 'REJECT' as const,
          comments: 'Must fix this issue immediately.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      expect(result).toContain('_(unknown)_');
    });
  });
});