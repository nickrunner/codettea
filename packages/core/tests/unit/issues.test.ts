import {
  parseIssueNumbers,
  hasLabel,
  isInProgress,
  groupIssuesByState,
  formatIssue,
  sortIssues,
  Issue,
} from '../../src/utils/issues';
import {extractStepNumber} from '../../src/utils/features';

describe('Issues Utilities', () => {
  describe('parseIssueNumbers', () => {
    it('should parse comma-separated issue numbers', () => {
      expect(parseIssueNumbers('1,2,3')).toEqual([1, 2, 3]);
      expect(parseIssueNumbers('10, 20, 30')).toEqual([10, 20, 30]);
      expect(parseIssueNumbers('5,10,15,20')).toEqual([5, 10, 15, 20]);
    });

    it('should handle spaces and invalid values', () => {
      expect(parseIssueNumbers(' 1 , 2 , 3 ')).toEqual([1, 2, 3]);
      expect(parseIssueNumbers('1,abc,3')).toEqual([1, 3]);
      expect(parseIssueNumbers('1,,3')).toEqual([1, 3]);
    });

    it('should return empty array for invalid input', () => {
      expect(parseIssueNumbers('')).toEqual([]);
      expect(parseIssueNumbers('abc')).toEqual([]);
      expect(parseIssueNumbers(',')).toEqual([]);
    });
  });

  describe('extractStepNumber', () => {
    it('should extract step numbers correctly', () => {
      expect(extractStepNumber('Step 1: Initial setup')).toBe(1);
      expect(extractStepNumber('feature - Step 10: Implementation')).toBe(10);
      expect(extractStepNumber('STEP 5: Testing')).toBe(5);
    });

    it('should return 999 for titles without steps', () => {
      expect(extractStepNumber('Fix bug')).toBe(999);
      expect(extractStepNumber('Update documentation')).toBe(999);
      expect(extractStepNumber('')).toBe(999);
    });
  });

  describe('hasLabel', () => {
    const issue: Issue = {
      number: 1,
      title: 'Test issue',
      state: 'open',
      labels: ['bug', 'high-priority', 'needs-review'],
      assignees: [],
    };

    it('should detect existing labels', () => {
      expect(hasLabel(issue, 'bug')).toBe(true);
      expect(hasLabel(issue, 'high-priority')).toBe(true);
      expect(hasLabel(issue, 'needs-review')).toBe(true);
    });

    it('should return false for non-existing labels', () => {
      expect(hasLabel(issue, 'feature')).toBe(false);
      expect(hasLabel(issue, 'low-priority')).toBe(false);
      expect(hasLabel(issue, '')).toBe(false);
    });
  });

  describe('isInProgress', () => {
    it('should detect in-progress issues', () => {
      const inProgressIssue: Issue = {
        number: 1,
        title: 'Test',
        state: 'open',
        labels: ['in-progress', 'bug'],
        assignees: [],
      };

      const notInProgressIssue: Issue = {
        number: 2,
        title: 'Test',
        state: 'open',
        labels: ['bug', 'ready'],
        assignees: [],
      };

      expect(isInProgress(inProgressIssue)).toBe(true);
      expect(isInProgress(notInProgressIssue)).toBe(false);
    });
  });

  describe('groupIssuesByState', () => {
    const issues: Issue[] = [
      {
        number: 1,
        title: 'Open 1',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 2,
        title: 'Closed 1',
        state: 'closed',
        labels: [],
        assignees: [],
      },
      {
        number: 3,
        title: 'Open 2',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 4,
        title: 'Closed 2',
        state: 'closed',
        labels: [],
        assignees: [],
      },
    ];

    it('should group issues by state', () => {
      const grouped = groupIssuesByState(issues);
      
      expect(grouped.open).toHaveLength(2);
      expect(grouped.closed).toHaveLength(2);
      expect(grouped.open.every(i => i.state === 'open')).toBe(true);
      expect(grouped.closed.every(i => i.state === 'closed')).toBe(true);
    });

    it('should handle empty array', () => {
      const grouped = groupIssuesByState([]);
      expect(grouped.open).toEqual([]);
      expect(grouped.closed).toEqual([]);
    });
  });

  describe('formatIssue', () => {
    const issue: Issue = {
      number: 42,
      title: 'Fix authentication bug',
      state: 'open',
      labels: ['bug', 'urgent'],
      assignees: ['alice', 'bob'],
    };

    it('should format issue with labels', () => {
      const formatted = formatIssue(issue, true);
      expect(formatted).toBe('🔴 #42: Fix authentication bug [bug, urgent]');
    });

    it('should format issue without labels', () => {
      const formatted = formatIssue(issue, false);
      expect(formatted).toBe('🔴 #42: Fix authentication bug');
    });

    it('should use correct icon for closed issues', () => {
      const closedIssue: Issue = { ...issue, state: 'closed' };
      const formatted = formatIssue(closedIssue);
      expect(formatted).toBe('✅ #42: Fix authentication bug [bug, urgent]');
    });

    it('should handle issues without labels', () => {
      const noLabelsIssue: Issue = { ...issue, labels: [] };
      const formatted = formatIssue(noLabelsIssue);
      expect(formatted).toBe('🔴 #42: Fix authentication bug');
    });
  });

  describe('sortIssues', () => {
    const issues: Issue[] = [
      {
        number: 30,
        title: 'Step 10: Last',
        state: 'closed',
        labels: [],
        assignees: [],
      },
      {
        number: 10,
        title: 'Step 1: First',
        state: 'open',
        labels: [],
        assignees: [],
      },
      {
        number: 20,
        title: 'Step 5: Middle',
        state: 'open',
        labels: [],
        assignees: [],
      },
    ];

    it('should sort by step number', () => {
      const sorted = sortIssues(issues, 'step');
      expect(sorted[0].title).toContain('Step 1');
      expect(sorted[1].title).toContain('Step 5');
      expect(sorted[2].title).toContain('Step 10');
    });

    it('should sort by issue number', () => {
      const sorted = sortIssues(issues, 'number');
      expect(sorted[0].number).toBe(10);
      expect(sorted[1].number).toBe(20);
      expect(sorted[2].number).toBe(30);
    });

    it('should sort by state', () => {
      const sorted = sortIssues(issues, 'state');
      expect(sorted[0].state).toBe('open');
      expect(sorted[1].state).toBe('open');
      expect(sorted[2].state).toBe('closed');
    });

    it('should not modify original array', () => {
      const original = [...issues];
      sortIssues(issues, 'step');
      expect(issues).toEqual(original);
    });
  });
});