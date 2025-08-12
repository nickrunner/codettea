import {
  extractStepNumber,
  sortIssuesByStep,
  filterIssuesByState,
  getIssueSummary,
  isValidFeatureName,
  selectSpecificIssue,
  IssueStatus,
} from '../../src/utils/features';

describe('Features Utilities', () => {
  describe('extractStepNumber', () => {
    it('should extract step number from standard format', () => {
      expect(extractStepNumber('Step 5: Create something')).toBe(5);
      expect(extractStepNumber('feature-name - Step 10: Update API')).toBe(10);
      expect(extractStepNumber('promotion-builder-v2 - Step 15: Configure')).toBe(15);
    });

    it('should handle case-insensitive matching', () => {
      expect(extractStepNumber('STEP 3: Uppercase')).toBe(3);
      expect(extractStepNumber('step 7: lowercase')).toBe(7);
      expect(extractStepNumber('Step 9: Mixed case')).toBe(9);
    });

    it('should return 999 for titles without step numbers', () => {
      expect(extractStepNumber('Regular issue title')).toBe(999);
      expect(extractStepNumber('Fix bug in authentication')).toBe(999);
      expect(extractStepNumber('')).toBe(999);
    });
  });

  describe('sortIssuesByStep', () => {
    const issues: IssueStatus[] = [
      {
        number: 1,
        title: 'Step 10: Last step',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 2,
        title: 'Step 1: First step',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 3,
        title: 'No step number',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 4,
        title: 'Step 5: Middle step',
        state: 'closed',
        labels: [],
        assignees: [],
      },
    ];

    it('should sort issues by step number', () => {
      const sorted = sortIssuesByStep(issues);
      expect(sorted[0].title).toBe('Step 1: First step');
      expect(sorted[1].title).toBe('Step 5: Middle step');
      expect(sorted[2].title).toBe('Step 10: Last step');
      expect(sorted[3].title).toBe('No step number');
    });

    it('should not modify original array', () => {
      const original = [...issues];
      sortIssuesByStep(issues);
      expect(issues).toEqual(original);
    });
  });

  describe('filterIssuesByState', () => {
    const issues: IssueStatus[] = [
      {
        number: 1,
        title: 'Open issue 1',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 2,
        title: 'Closed issue 1',
        state: 'closed',
        labels: [],
        assignees: [],
      },
      {
        number: 3,
        title: 'Open issue 2',
        state: 'open',
        labels: [],
        assignees: [],
      },
    ];

    it('should filter open issues', () => {
      const open = filterIssuesByState(issues, 'open');
      expect(open).toHaveLength(2);
      expect(open.every(i => i.state === 'open')).toBe(true);
    });

    it('should filter closed issues', () => {
      const closed = filterIssuesByState(issues, 'closed');
      expect(closed).toHaveLength(1);
      expect(closed[0].state).toBe('closed');
    });
  });

  describe('getIssueSummary', () => {
    it('should calculate correct summary statistics', () => {
      const issues: IssueStatus[] = [
        {
          number: 1,
          title: 'Issue 1',
          state: 'open',
          labels: [],
          assignees: [],
          inProgress: true,
        },
        {
          number: 2,
          title: 'Issue 2',
          state: 'closed',
          labels: [],
          assignees: [],
        },
        {
          number: 3,
          title: 'Issue 3',
          state: 'open',
          labels: [],
          assignees: [],
        },
        {
          number: 4,
          title: 'Issue 4',
          state: 'open',
          labels: [],
          assignees: [],
          inProgress: true,
        },
      ];

      const summary = getIssueSummary(issues);
      expect(summary.total).toBe(4);
      expect(summary.open).toBe(3);
      expect(summary.closed).toBe(1);
      expect(summary.inProgress).toBe(2);
    });

    it('should handle empty array', () => {
      const summary = getIssueSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.open).toBe(0);
      expect(summary.closed).toBe(0);
      expect(summary.inProgress).toBe(0);
    });
  });

  describe('isValidFeatureName', () => {
    it('should accept valid feature names', () => {
      expect(isValidFeatureName('user-auth')).toBe(true);
      expect(isValidFeatureName('api-v2')).toBe(true);
      expect(isValidFeatureName('feature-123')).toBe(true);
      expect(isValidFeatureName('ab')).toBe(true);
    });

    it('should reject invalid feature names', () => {
      expect(isValidFeatureName('User-Auth')).toBe(false); // uppercase
      expect(isValidFeatureName('user_auth')).toBe(false); // underscore
      expect(isValidFeatureName('user auth')).toBe(false); // space
      expect(isValidFeatureName('user.auth')).toBe(false); // dot
      expect(isValidFeatureName('a')).toBe(false); // too short
      expect(isValidFeatureName('a'.repeat(51))).toBe(false); // too long
      expect(isValidFeatureName('')).toBe(false); // empty
    });
  });

  describe('selectSpecificIssue', () => {
    const issues: IssueStatus[] = [
      {
        number: 10,
        title: 'Issue 10',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 20,
        title: 'Issue 20',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 30,
        title: 'Issue 30',
        state: 'open',
        labels: [],
        assignees: [],
      },
    ];

    it('should select by list index', () => {
      expect(selectSpecificIssue(issues, '1')?.number).toBe(10);
      expect(selectSpecificIssue(issues, '2')?.number).toBe(20);
      expect(selectSpecificIssue(issues, '3')?.number).toBe(30);
    });

    it('should select by issue number', () => {
      expect(selectSpecificIssue(issues, '10')?.number).toBe(10);
      expect(selectSpecificIssue(issues, '20')?.number).toBe(20);
      expect(selectSpecificIssue(issues, '30')?.number).toBe(30);
    });

    it('should return undefined for invalid selection', () => {
      expect(selectSpecificIssue(issues, '0')).toBeUndefined();
      expect(selectSpecificIssue(issues, '4')).toBeUndefined();
      expect(selectSpecificIssue(issues, '99')).toBeUndefined();
      expect(selectSpecificIssue(issues, 'invalid')).toBeUndefined();
    });
  });
});