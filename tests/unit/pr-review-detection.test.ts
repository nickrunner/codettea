// Unit test for PR review detection functionality

import { GitHubUtils } from '../../src/utils/github';

describe('PR Review Detection', () => {
  describe('hasPendingChangeRequests', () => {
    it('should handle non-existent PRs gracefully', async () => {
      const hasChangeRequests = await GitHubUtils.hasPendingChangeRequests(99999, process.cwd());
      expect(hasChangeRequests).toBe(false);
    });

    it('should return false when no reviews exist', async () => {
      // Mock getPRReviews to return empty array
      jest.spyOn(GitHubUtils, 'getPRReviews').mockResolvedValue([]);
      
      const hasChangeRequests = await GitHubUtils.hasPendingChangeRequests(123, process.cwd());
      expect(hasChangeRequests).toBe(false);
    });

    it('should detect pending change requests', async () => {
      // Mock getPRReviews to return reviews with changes requested
      jest.spyOn(GitHubUtils, 'getPRReviews').mockResolvedValue([
        {
          state: 'CHANGES_REQUESTED',
          author: { login: 'reviewer1' },
          submittedAt: '2024-01-01T10:00:00Z'
        }
      ]);

      const hasChangeRequests = await GitHubUtils.hasPendingChangeRequests(123, process.cwd());
      expect(hasChangeRequests).toBe(true);
    });

    it('should handle latest review states correctly', async () => {
      // Mock multiple reviews from same reviewer - latest should win
      jest.spyOn(GitHubUtils, 'getPRReviews').mockResolvedValue([
        {
          state: 'CHANGES_REQUESTED',
          author: { login: 'reviewer1' },
          submittedAt: '2024-01-01T10:00:00Z'
        },
        {
          state: 'APPROVED',
          author: { login: 'reviewer1' },
          submittedAt: '2024-01-01T11:00:00Z'
        }
      ]);

      const hasChangeRequests = await GitHubUtils.hasPendingChangeRequests(123, process.cwd());
      expect(hasChangeRequests).toBe(false);
    });
  });

  describe('getPRReviews', () => {
    it('should return empty array for non-existent PRs', async () => {
      const reviews = await GitHubUtils.getPRReviews(99999, process.cwd());
      expect(Array.isArray(reviews)).toBe(true);
      expect(reviews.length).toBe(0);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});