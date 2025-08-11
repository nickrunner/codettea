import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import path from 'path';
import {GitHubUtils} from './github';

const execAsync = promisify(exec);

export interface FeatureStatus {
  name: string;
  branch: string;
  worktreePath: string;
  exists: boolean;
  issues: IssueStatus[];
  project?: string;
}

export interface IssueStatus {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  inProgress?: boolean;
}

export interface FeatureConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks?: number;
  requiredApprovals?: number;
  reviewerProfiles?: string[];
  baseBranch?: string;
}

/**
 * Get existing features with active worktrees
 */
export async function getExistingFeatures(
  config: FeatureConfig,
  selectedProject?: string,
): Promise<FeatureStatus[]> {
  const features: FeatureStatus[] = [];

  try {
    // Get active feature branches (both local and remote)
    const {stdout: remoteBranches} = await execAsync(
      'git branch -r --no-merged',
      {cwd: config.mainRepoPath},
    );
    const {stdout: localBranches} = await execAsync('git branch', {
      cwd: config.mainRepoPath,
    });

    // Combine and deduplicate branches
    const allBranches = [
      ...remoteBranches.split('\n'),
      ...localBranches.split('\n'),
    ];
    const branches = allBranches
      .filter(line => line.includes('feature/'))
      .map(line => line.trim().replace('origin/', '').replace('* ', ''))
      .filter(branch => branch.startsWith('feature/'))
      .filter(branch => !branch.includes('-issue-')) // Filter out issue-specific branches
      .filter((branch, index, arr) => arr.indexOf(branch) === index); // deduplicate

    for (const branch of branches) {
      const featureName = branch.replace('feature/', '');
      const projectName = selectedProject || path.basename(config.mainRepoPath);
      const worktreePath = path.join(
        config.baseWorktreePath,
        `${projectName}-${featureName}`,
      );

      // Check if worktree exists
      let exists = false;
      try {
        await fs.access(worktreePath);
        exists = true;
      } catch {
        // Worktree doesn't exist, skip this feature since we only want features with worktrees
        continue;
      }

      // Get issues for this feature
      const issues = await getFeatureIssues(featureName, config.mainRepoPath);

      features.push({
        name: featureName,
        branch,
        worktreePath,
        exists,
        issues,
      });
    }
  } catch (error) {
    console.warn('Could not fetch existing features:', error);
  }

  return features;
}

/**
 * Get issues for a specific feature
 */
export async function getFeatureIssues(
  featureName: string,
  mainRepoPath: string,
): Promise<IssueStatus[]> {
  try {
    // First try to get issues by label
    let issues: IssueStatus[] = [];

    try {
      const {stdout} = await execAsync(
        `gh issue list --label "${featureName}" --limit 50 --json number,title,state,labels,assignees`,
        {cwd: mainRepoPath},
      );
      const rawIssues = JSON.parse(stdout);

      issues = rawIssues.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(), // Normalize to lowercase
        labels: issue.labels.map((l: any) => l.name),
        assignees: issue.assignees.map((a: any) => a.login),
        inProgress: issue.labels.some((l: any) => l.name === 'in-progress'),
      }));
    } catch {
      // Failed to get issues by label
    }

    // Fallback: search for issues with feature name in title if no labeled issues found
    if (issues.length === 0) {
      try {
        const {stdout} = await execAsync(
          `gh issue list --search "${featureName} in:title" --limit 20 --json number,title,state,labels,assignees`,
          {cwd: mainRepoPath},
        );
        const rawSearchResults = JSON.parse(stdout);

        const searchResults = rawSearchResults.map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state.toLowerCase(), // Normalize to lowercase
          labels: issue.labels.map((l: any) => l.name),
          assignees: issue.assignees.map((a: any) => a.login),
          inProgress: issue.labels.some((l: any) => l.name === 'in-progress'),
        }));

        // Filter to only issues that actually contain the feature name
        issues = searchResults.filter((issue: IssueStatus) =>
          issue.title.toLowerCase().includes(featureName.toLowerCase()),
        );
      } catch {
        // Failed to search issues
      }
    }

    return issues;
  } catch {
    return [];
  }
}

/**
 * Get comprehensive feature details
 */
export async function getFeatureDetails(
  featureName: string,
  config: FeatureConfig,
  selectedProject?: string,
): Promise<FeatureStatus | undefined> {
  const features = await getExistingFeatures(config, selectedProject);
  return features.find(f => f.name === featureName);
}

/**
 * Work on the next issue in a feature (lowest step number)
 */
export async function workOnNextIssue(
  _feature: FeatureStatus,
  sortedIssues: IssueStatus[],
): Promise<{issueNumber: number; stepNum: number; stepText: string} | null> {
  const openIssues = sortedIssues.filter(i => i.state === 'open');

  if (openIssues.length === 0) {
    return null;
  }

  // Get the issue with the lowest step number (first in sorted array)
  const nextIssue = openIssues[0];
  const stepNum = extractStepNumber(nextIssue.title);
  const stepText = stepNum !== 999 ? `Step ${stepNum}` : 'No Step';

  return {
    issueNumber: nextIssue.number,
    stepNum,
    stepText,
  };
}

/**
 * Select a specific issue to work on
 */
export function selectSpecificIssue(
  openIssues: IssueStatus[],
  choice: string,
): IssueStatus | undefined {
  let selectedIssue: IssueStatus | undefined;

  // Check if input is a list number (1, 2, 3, etc.)
  if (/^\d+$/.test(choice.trim())) {
    const choiceNum = parseInt(choice.trim());

    // First try as list index
    if (choiceNum >= 1 && choiceNum <= openIssues.length) {
      selectedIssue = openIssues[choiceNum - 1];
    } else {
      // Try as actual issue number
      selectedIssue = openIssues.find(issue => issue.number === choiceNum);
    }
  }

  return selectedIssue;
}

/**
 * Add issues to a feature by adding labels
 */
export async function addIssuesToFeature(
  featureName: string,
  issueNumbers: number[],
  mainRepoPath: string,
): Promise<{success: number[]; failed: number[]}> {
  const success: number[] = [];
  const failed: number[] = [];

  for (const issueNum of issueNumbers) {
    try {
      await GitHubUtils.addIssueLabel(issueNum, featureName, mainRepoPath);
      success.push(issueNum);
    } catch (error) {
      failed.push(issueNum);
    }
  }

  return {success, failed};
}

/**
 * Extract step number from issue title
 */
export function extractStepNumber(title: string): number {
  // Try to extract step number from patterns like:
  // "promotion-builder-v2 - Step 2: Finalize promotion data models"
  // "Step 10: Create something"
  // "promotion-builder-v2 - Step 15: Configure CMS outlets data"

  const stepMatch = title.match(/step\s+(\d+)/i);
  return stepMatch ? parseInt(stepMatch[1], 10) : 999; // Put non-step issues at the end
}

/**
 * Sort issues by step number
 */
export function sortIssuesByStep(issues: IssueStatus[]): IssueStatus[] {
  return [...issues].sort((a, b) => {
    const stepA = extractStepNumber(a.title);
    const stepB = extractStepNumber(b.title);
    return stepA - stepB;
  });
}

/**
 * Filter issues by state
 */
export function filterIssuesByState(
  issues: IssueStatus[],
  state: 'open' | 'closed',
): IssueStatus[] {
  return issues.filter(i => i.state === state);
}

/**
 * Get issue summary statistics
 */
export function getIssueSummary(issues: IssueStatus[]): {
  total: number;
  open: number;
  closed: number;
  inProgress: number;
} {
  return {
    total: issues.length,
    open: issues.filter(i => i.state === 'open').length,
    closed: issues.filter(i => i.state === 'closed').length,
    inProgress: issues.filter(i => i.inProgress).length,
  };
}

/**
 * Validate feature name format
 */
export function isValidFeatureName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name) && name.length >= 2 && name.length <= 50;
}