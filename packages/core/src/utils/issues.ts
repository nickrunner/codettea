import {exec} from 'child_process';
import {promisify} from 'util';
import {extractStepNumber} from './features';

const execAsync = promisify(exec);

export interface Issue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  body?: string;
}

/**
 * Parse issue numbers from comma-separated string
 */
export function parseIssueNumbers(input: string): number[] {
  return input
    .split(',')
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n));
}


/**
 * Get recent issues from repository
 */
export async function getRecentIssues(
  mainRepoPath: string,
  limit: number = 5,
): Promise<Issue[]> {
  try {
    const {stdout} = await execAsync(
      `gh issue list --limit ${limit} --json number,title,state,labels,assignees,body`,
      {
        cwd: mainRepoPath,
      },
    );

    const issues = JSON.parse(stdout);
    return issues.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state.toLowerCase(),
      labels: issue.labels.map((l: any) => l.name),
      assignees: issue.assignees.map((a: any) => a.login),
      body: issue.body,
    }));
  } catch {
    return [];
  }
}

/**
 * Search for issues by query
 */
export async function searchIssues(
  query: string,
  mainRepoPath: string,
  limit: number = 20,
): Promise<Issue[]> {
  try {
    const {stdout} = await execAsync(
      `gh issue list --search "${query}" --limit ${limit} --json number,title,state,labels,assignees`,
      {
        cwd: mainRepoPath,
      },
    );

    const issues = JSON.parse(stdout);
    return issues.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state.toLowerCase(),
      labels: issue.labels.map((l: any) => l.name),
      assignees: issue.assignees.map((a: any) => a.login),
    }));
  } catch {
    return [];
  }
}

/**
 * Get issues by label
 */
export async function getIssuesByLabel(
  label: string,
  mainRepoPath: string,
  limit: number = 50,
): Promise<Issue[]> {
  try {
    const {stdout} = await execAsync(
      `gh issue list --label "${label}" --limit ${limit} --json number,title,state,labels,assignees`,
      {
        cwd: mainRepoPath,
      },
    );

    const issues = JSON.parse(stdout);
    return issues.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state.toLowerCase(),
      labels: issue.labels.map((l: any) => l.name),
      assignees: issue.assignees.map((a: any) => a.login),
    }));
  } catch {
    return [];
  }
}

/**
 * Check if issue has a specific label
 */
export function hasLabel(issue: Issue, label: string): boolean {
  return issue.labels.includes(label);
}

/**
 * Check if issue is in progress
 */
export function isInProgress(issue: Issue): boolean {
  return hasLabel(issue, 'in-progress');
}

/**
 * Group issues by state
 */
export function groupIssuesByState(issues: Issue[]): {
  open: Issue[];
  closed: Issue[];
} {
  return {
    open: issues.filter(i => i.state === 'open'),
    closed: issues.filter(i => i.state === 'closed'),
  };
}

/**
 * Format issue for display
 */
export function formatIssue(issue: Issue, includeLabels: boolean = true): string {
  const stateIcon = issue.state === 'open' ? '🔴' : '✅';
  const labels = includeLabels && issue.labels.length > 0
    ? ` [${issue.labels.join(', ')}]`
    : '';
  return `${stateIcon} #${issue.number}: ${issue.title}${labels}`;
}

/**
 * Sort issues by multiple criteria
 */
export function sortIssues(
  issues: Issue[],
  criteria: 'step' | 'number' | 'state' = 'step',
): Issue[] {
  const sorted = [...issues];

  switch (criteria) {
    case 'step':
      return sorted.sort((a, b) => {
        const stepA = extractStepNumber(a.title);
        const stepB = extractStepNumber(b.title);
        return stepA - stepB;
      });
    case 'number':
      return sorted.sort((a, b) => a.number - b.number);
    case 'state':
      return sorted.sort((a, b) => {
        if (a.state === b.state) return a.number - b.number;
        return a.state === 'open' ? -1 : 1;
      });
    default:
      return sorted;
  }
}