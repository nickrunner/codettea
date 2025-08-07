/**
 * Shared type definitions for the multi-agent development system
 */

/**
 * Represents a task/issue in the feature development process
 */
export interface FeatureTask {
  issueNumber: number;
  title: string;
  description: string;
  dependencies: number[]; // Other issue numbers this depends on
  status:
    | 'pending'
    | 'solving'
    | 'reviewing'
    | 'approved'
    | 'rejected'
    | 'completed';
  attempts: number;
  maxAttempts: number;
  reviewHistory: TaskReview[];
  worktreePath?: string;
  branch?: string;
  prNumber?: number;
}

/**
 * Represents a review of a task
 */
export interface TaskReview {
  reviewerId: string;
  result: 'APPROVE' | 'REJECT';
  comments: string;
  timestamp: number;
  prNumber?: number;
}

/**
 * Specification for a feature to be developed
 */
export interface FeatureSpec {
  name: string;
  description: string;
  baseBranch: string; // Usually 'main'/'master' or 'feature/feature-name'
  issues?: number[]; // GitHub issue numbers (optional for arch mode)
  isParentFeature: boolean; // True if this creates a feature branch, false if working on existing feature
  architectureMode: boolean; // True if we need to run architecture phase first
}

/**
 * Status of a feature in development
 */
export interface FeatureStatus {
  name: string;
  branch: string;
  worktreePath: string;
  exists: boolean;
  issues: IssueStatus[];
  project?: string;
}

/**
 * Status of a GitHub issue
 */
export interface IssueStatus {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  inProgress?: boolean;
}

/**
 * Result from running tests
 */
export interface TestResult {
  success: boolean;
  output: string;
  duration: number;
  type: string;
}

/**
 * Configuration for the multi-agent orchestrator
 */
export interface OrchestratorConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  baseBranch?: string; // Optional project-specific base branch override
}

/**
 * Configuration for a specific project
 */
export interface ProjectConfig extends OrchestratorConfig {
  name: string;
  description?: string;
}

/**
 * Agent types in the system
 */
export type AgentType = 'architecture' | 'solver' | 'reviewer';

/**
 * Agent states during execution
 */
export type AgentState = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';

/**
 * Review results
 */
export type ReviewResult = 'APPROVE' | 'REJECT' | 'COMMENT';

/**
 * Task status states
 */
export type TaskStatus = 
  | 'pending'
  | 'solving'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'completed';

/**
 * Issue states in GitHub
 */
export type IssueState = 'open' | 'closed';

/**
 * Type guards
 */

/**
 * Check if a value is a FeatureTask
 */
export function isFeatureTask(value: unknown): value is FeatureTask {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const task = value as Record<string, unknown>;
  
  return (
    typeof task.issueNumber === 'number' &&
    typeof task.title === 'string' &&
    typeof task.description === 'string' &&
    Array.isArray(task.dependencies) &&
    task.dependencies.every((dep: unknown) => typeof dep === 'number') &&
    isTaskStatus(task.status) &&
    typeof task.attempts === 'number' &&
    typeof task.maxAttempts === 'number' &&
    Array.isArray(task.reviewHistory) &&
    task.reviewHistory.every(isTaskReview)
  );
}

/**
 * Check if a value is a TaskReview
 */
export function isTaskReview(value: unknown): value is TaskReview {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const review = value as Record<string, unknown>;
  
  return (
    typeof review.reviewerId === 'string' &&
    isReviewResult(review.result) &&
    typeof review.comments === 'string' &&
    typeof review.timestamp === 'number'
  );
}

/**
 * Check if a value is a FeatureSpec
 */
export function isFeatureSpec(value: unknown): value is FeatureSpec {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const spec = value as Record<string, unknown>;
  
  return (
    typeof spec.name === 'string' &&
    typeof spec.description === 'string' &&
    typeof spec.baseBranch === 'string' &&
    typeof spec.isParentFeature === 'boolean' &&
    typeof spec.architectureMode === 'boolean' &&
    (spec.issues === undefined || 
      (Array.isArray(spec.issues) && 
       spec.issues.every((issue: unknown) => typeof issue === 'number')))
  );
}

/**
 * Check if a value is a valid TaskStatus
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === 'string' &&
    ['pending', 'solving', 'reviewing', 'approved', 'rejected', 'completed'].includes(value)
  );
}

/**
 * Check if a value is a valid ReviewResult
 */
export function isReviewResult(value: unknown): value is ReviewResult {
  return (
    typeof value === 'string' &&
    ['APPROVE', 'REJECT', 'COMMENT'].includes(value)
  );
}

/**
 * Check if a value is a valid AgentType
 */
export function isAgentType(value: unknown): value is AgentType {
  return (
    typeof value === 'string' &&
    ['architecture', 'solver', 'reviewer'].includes(value)
  );
}

/**
 * Check if a value is a valid AgentState
 */
export function isAgentState(value: unknown): value is AgentState {
  return (
    typeof value === 'string' &&
    ['idle', 'running', 'success', 'failed', 'cancelled'].includes(value)
  );
}

/**
 * Check if a value is a valid IssueState
 */
export function isIssueState(value: unknown): value is IssueState {
  return (
    typeof value === 'string' &&
    ['open', 'closed'].includes(value)
  );
}

/**
 * Check if a value is an IssueStatus
 */
export function isIssueStatus(value: unknown): value is IssueStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const issue = value as Record<string, unknown>;
  
  return (
    typeof issue.number === 'number' &&
    typeof issue.title === 'string' &&
    isIssueState(issue.state) &&
    Array.isArray(issue.labels) &&
    issue.labels.every((label: unknown) => typeof label === 'string') &&
    Array.isArray(issue.assignees) &&
    issue.assignees.every((assignee: unknown) => typeof assignee === 'string') &&
    (issue.inProgress === undefined || typeof issue.inProgress === 'boolean')
  );
}

/**
 * Check if a value is a FeatureStatus
 */
export function isFeatureStatus(value: unknown): value is FeatureStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const feature = value as Record<string, unknown>;
  
  return (
    typeof feature.name === 'string' &&
    typeof feature.branch === 'string' &&
    typeof feature.worktreePath === 'string' &&
    typeof feature.exists === 'boolean' &&
    Array.isArray(feature.issues) &&
    feature.issues.every(isIssueStatus) &&
    (feature.project === undefined || typeof feature.project === 'string')
  );
}

/**
 * Check if a value is a TestResult
 */
export function isTestResult(value: unknown): value is TestResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const result = value as Record<string, unknown>;
  
  return (
    typeof result.success === 'boolean' &&
    typeof result.output === 'string' &&
    typeof result.duration === 'number' &&
    typeof result.type === 'string'
  );
}

/**
 * Check if a value is an OrchestratorConfig
 */
export function isOrchestratorConfig(value: unknown): value is OrchestratorConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const config = value as Record<string, unknown>;
  
  return (
    typeof config.mainRepoPath === 'string' &&
    typeof config.baseWorktreePath === 'string' &&
    typeof config.maxConcurrentTasks === 'number' &&
    typeof config.requiredApprovals === 'number' &&
    Array.isArray(config.reviewerProfiles) &&
    config.reviewerProfiles.every((profile: unknown) => typeof profile === 'string') &&
    (config.baseBranch === undefined || typeof config.baseBranch === 'string')
  );
}