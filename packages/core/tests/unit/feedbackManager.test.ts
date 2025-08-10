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
      expect(result).toBe('No previous attempts - this is the first implementation attempt.');
    });

    it('should directly return reviewer feedback without processing', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'This is not good. Very bad. Terrible work.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 2);
      expect(result).toContain('## Previous Review Feedback (Attempt 2)');
      expect(result).toContain('### Reviewer 1 (reviewer-1)');
      expect(result).toContain('This is not good. Very bad. Terrible work.');
    });

    it('should pass through structured review feedback directly', () => {
      const reviewHistory = [
        {
          reviewerId: 'frontend-reviewer',
          result: 'REJECT' as const,
          comments: '## ❌ REJECT\n**REWORK_REQUIRED**: TypeScript errors need fixing\n\n### Critical Issues (Must Fix)\n- Must fix TypeScript errors in component\n- Need to add proper validation',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 2);
      
      expect(result).toContain('## Previous Review Feedback (Attempt 2)');
      expect(result).toContain('### Reviewer 1 (frontend-reviewer)');
      expect(result).toContain('**REWORK_REQUIRED**: TypeScript errors need fixing');
      expect(result).toContain('### Critical Issues (Must Fix)');
      expect(result).toContain('- Must fix TypeScript errors in component');
    });

    it('should handle multiple reviewers correctly', () => {
      const reviewHistory = [
        {
          reviewerId: 'backend-reviewer',
          result: 'REJECT' as const,
          comments: '## ❌ REJECT\n**REWORK_REQUIRED**: API documentation missing\n\n### Additional Feedback\n- Should update API documentation\n- Consider adding unit tests',
          timestamp: Date.now(),
        },
        {
          reviewerId: 'frontend-reviewer',
          result: 'REJECT' as const,
          comments: '## ❌ REJECT\n**REWORK_REQUIRED**: Component issues\n\n### Critical Issues\n- Fix component prop types',
          timestamp: Date.now() - 100,
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 3);
      
      expect(result).toContain('### Reviewer 1 (backend-reviewer)');
      expect(result).toContain('### Reviewer 2 (frontend-reviewer)');
      expect(result).toContain('API documentation missing');
      expect(result).toContain('Fix component prop types');
    });

    it('should handle timestamp-based filtering for recent reviews', () => {
      const now = Date.now();
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'Old feedback from previous attempt.',
          timestamp: now - 10 * 60 * 1000, // 10 minutes ago (outside window)
        },
        {
          reviewerId: 'reviewer-2',
          result: 'REJECT' as const,
          comments: 'Recent feedback: must fix critical issue.',
          timestamp: now, // Recent timestamp
        },
        {
          reviewerId: 'reviewer-3',
          result: 'REJECT' as const,
          comments: 'Another recent: need to add validation.',
          timestamp: now - 2 * 60 * 1000, // 2 minutes ago (within window)
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 3);
      
      // Should contain recent feedback within the 5-minute window
      expect(result).toContain('must fix critical issue');
      expect(result).toContain('need to add validation');
      // Should not contain old feedback from outside the window
      expect(result).not.toContain('Old feedback from previous attempt');
    });

    it('should handle empty review history gracefully', () => {
      const result = FeedbackManager.generatePreviousFailureFeedback([], 1);
      expect(result).toBe('No previous attempts - this is the first implementation attempt.');
    });

    it('should handle first attempt correctly', () => {
      const reviewHistory = [
        {
          reviewerId: 'reviewer-1',
          result: 'REJECT' as const,
          comments: 'First attempt feedback.',
          timestamp: Date.now(),
        },
      ];

      const result = FeedbackManager.generatePreviousFailureFeedback(reviewHistory, 1);
      expect(result).toContain('First attempt feedback');
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

  describe('edge cases', () => {
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
      expect(result).toContain('### Reviewer 1 (reviewer-1)');
      // Empty comments should still be included in the structure
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
      expect(result).toContain('### Reviewer 1 (reviewer-1)');
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
      expect(result).toContain('### Reviewer 1 ()');
      expect(result).toContain('Must fix this issue immediately');
    });
  });
});