import {
  Feature,
  Issue,
  CreateFeatureRequest,
  WorkFeatureRequest,
  AddIssuesRequest,
  ExecuteFeatureRequest,
  ExecutionStatus,
} from '../controllers/FeaturesController';
import {logger} from '../utils/logger';
import path from 'path';
import fs from 'fs-extra';
import {ValidationError} from '../utils/errors';
import {Orchestrator as CoreOrchestrator} from '@codettea/core';
import {
  getExistingFeatures,
  getFeatureIssues,
  getFeatureDetails,
  workOnNextIssue,
  selectSpecificIssue,
  addIssuesToFeature,
  sortIssuesByStep,
  isValidFeatureName,
  type FeatureConfig,
} from '@codettea/core';
import {
  getWorktreeStatus,
} from '@codettea/core';
import { taskQueue, QueuedTask } from './TaskQueueService';
import { sseService } from './SSEService';
import { spawn } from 'child_process';

// Type definition for Orchestrator from @codettea/core
interface OrchestratorConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
}

interface FeatureExecutionOptions {
  name: string;
  description: string;
  baseBranch: string;
  isParentFeature: boolean;
  architectureMode: boolean;
  issues?: number[];
}

interface Orchestrator {
  executeFeature(options: FeatureExecutionOptions): Promise<void>;
}

export class FeaturesService {
  private featuresPath = path.join(process.cwd(), '.codettea');
  private orchestrator: Orchestrator | null = null;
  private config: FeatureConfig;
  private executionStatus: Map<string, ExecutionStatus> = new Map();

  constructor() {
    this.config = {
      mainRepoPath: process.env.MAIN_REPO_PATH || process.cwd(),
      baseWorktreePath: path.dirname(process.env.MAIN_REPO_PATH || process.cwd()),
      maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '2'),
      requiredApprovals: parseInt(process.env.REQUIRED_APPROVALS || '3'),
      reviewerProfiles: (process.env.REVIEWER_PROFILES || 'backend,frontend,devops').split(','),
      baseBranch: process.env.BASE_BRANCH || 'main',
    };
    
    // Set up task executor
    taskQueue.setExecutor(this.executeTask.bind(this));
    
    // Set up task queue event listeners
    this.setupTaskQueueListeners();
  }

  async getAllFeatures(): Promise<Feature[]> {
    try {
      // Get features with active worktrees using shared utility
      const activeFeatures = await getExistingFeatures(this.config);
      
      // Also check for features in .codettea directory that might not have worktrees
      const allFeatures: Feature[] = [];
      
      // Add active features from worktrees
      for (const activeFeature of activeFeatures) {
        const feature: Feature = {
          name: activeFeature.name,
          description: `Feature with active worktree`,
          status: 'in_progress',
          branch: activeFeature.branch,
          worktreePath: activeFeature.worktreePath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Try to load metadata for more details
        const metadata = await this.loadFeatureMetadata(activeFeature.name);
        if (metadata) {
          feature.description = metadata.description;
          feature.createdAt = metadata.createdAt;
          feature.updatedAt = metadata.updatedAt;
        }
        
        allFeatures.push(feature);
      }
      
      // Check for features in .codettea without worktrees
      if (await fs.pathExists(this.featuresPath)) {
        const dirs = await fs.readdir(this.featuresPath);
        for (const dir of dirs) {
          const featurePath = path.join(this.featuresPath, dir);
          const stat = await fs.stat(featurePath);

          if (stat.isDirectory()) {
            // Skip if already added from active features
            if (!allFeatures.find(f => f.name === dir)) {
              const feature = await this.loadFeatureMetadata(dir);
              if (feature) {
                allFeatures.push(feature);
              }
            }
          }
        }
      }

      return allFeatures;
    } catch (error) {
      logger.error('Error loading features:', error);
      return [];
    }
  }

  async getFeature(name: string): Promise<Feature | null> {
    try {
      // Validate input using shared utility
      if (!isValidFeatureName(name)) {
        throw new ValidationError(`Invalid feature name: ${name}`);
      }
      
      // Get feature details using shared utility
      const featureStatus = await getFeatureDetails(name, this.config);
      
      if (featureStatus) {
        const feature: Feature = {
          name: featureStatus.name,
          description: `Feature with active worktree`,
          status: 'in_progress',
          branch: featureStatus.branch,
          worktreePath: featureStatus.worktreePath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Try to load metadata for more details
        const metadata = await this.loadFeatureMetadata(name);
        if (metadata) {
          feature.description = metadata.description;
          feature.createdAt = metadata.createdAt;
          feature.updatedAt = metadata.updatedAt;
        }
        
        return feature;
      }
      
      // Fallback to loading from metadata if no worktree
      return await this.loadFeatureMetadata(name);
    } catch (error) {
      logger.error(`Error loading feature:`, error);
      return null;
    }
  }

  async getFeatureIssues(
    name: string,
    status?: 'open' | 'closed' | 'all',
  ): Promise<Issue[]> {
    try {
      // Validate input using shared utility
      if (!isValidFeatureName(name)) {
        throw new ValidationError(`Invalid feature name: ${name}`);
      }
      
      // Get issues using shared utility
      const issueStatuses = await getFeatureIssues(name, this.config.mainRepoPath);
      
      // Convert IssueStatus to Issue format
      const issues: Issue[] = issueStatuses.map(issueStatus => ({
        number: issueStatus.number,
        title: issueStatus.title,
        status: issueStatus.state === 'open' 
          ? (issueStatus.inProgress ? 'in_progress' : 'open') 
          : 'closed',
        assignee: issueStatus.assignees?.[0],
        labels: issueStatus.labels,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      // Filter by status if requested
      if (status && status !== 'all') {
        if (status === 'open') {
          return issues.filter(issue => issue.status === 'open' || issue.status === 'in_progress');
        } else {
          return issues.filter(issue => issue.status === status);
        }
      }
      
      // Also try to read from local cache and merge
      const issuesPath = path.join(this.featuresPath, name, 'issues.json');
      try {
        if (await fs.pathExists(issuesPath)) {
          const cachedIssues: Issue[] = await fs.readJson(issuesPath);
          
          // Merge cached issues that aren't in the live data
          for (const cachedIssue of cachedIssues) {
            if (!issues.find(i => i.number === cachedIssue.number)) {
              issues.push(cachedIssue);
            }
          }
        }
      } catch (fsError) {
        logger.debug(`Could not read local issues cache for ${name}:`, fsError);
      }

      return issues;
    } catch (error) {
      logger.error(`Error loading issues for feature ${name}:`, error);
      return [];
    }
  }

  async createFeature(request: CreateFeatureRequest): Promise<Feature> {
    try {
      // Validate input using shared utility
      if (!isValidFeatureName(request.name)) {
        throw new ValidationError(`Invalid feature name: ${request.name}`);
      }
      if (!request.description || request.description.trim().length === 0) {
        throw new ValidationError('Feature description is required');
      }
      if (request.description.length > 1000) {
        throw new ValidationError(
          'Feature description must be less than 1000 characters',
        );
      }

      const feature: Feature = {
        name: request.name,
        description: request.description,
        status: 'planning',
        branch: `feature/${request.name}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const featurePath = path.join(this.featuresPath, request.name);

      // Wrap fs operations in try-catch
      try {
        await fs.ensureDir(featurePath);
        await fs.writeJson(path.join(featurePath, 'metadata.json'), feature, {
          spaces: 2,
        });
      } catch (fsError) {
        logger.error(
          `Failed to create feature directory for ${request.name}:`,
          fsError,
        );
        throw new Error(`Failed to create feature: ${fsError}`);
      }

      if (request.architectureMode) {
        logger.info(
          `Feature ${request.name} created with architecture mode enabled`,
        );

        // Initialize orchestrator for architecture mode
        const config: OrchestratorConfig = {
          mainRepoPath: process.cwd(),
          baseWorktreePath: path.dirname(process.cwd()),
          maxConcurrentTasks: 2,
          requiredApprovals: 3,
          reviewerProfiles: ['backend', 'frontend', 'devops'],
        };

        try {
          this.orchestrator = new CoreOrchestrator(config, request.name);

          // Run architecture phase in background (non-blocking)
          if (this.orchestrator) {
            this.orchestrator
              .executeFeature({
                name: request.name,
                description: request.description,
                baseBranch: 'main',
                isParentFeature: true,
                architectureMode: true,
              })
              .catch((error: unknown) => {
                logger.error(
                  `Architecture phase failed for ${request.name}:`,
                  error,
                );
              });
          }
        } catch (orchestratorError) {
          logger.error(
            `Failed to initialize orchestrator for ${request.name}:`,
            orchestratorError,
          );
          // Continue without architecture mode - feature is still created
        }
      }

      return feature;
    } catch (error) {
      logger.error(`Error creating feature ${request.name}:`, error);
      throw error;
    }
  }

  private async loadFeatureMetadata(name: string): Promise<Feature | null> {
    try {
      // Validate input to prevent path traversal
      if (!isValidFeatureName(name)) {
        return null;
      }
      const metadataPath = path.join(this.featuresPath, name, 'metadata.json');

      if (!(await fs.pathExists(metadataPath))) {
        return null;
      }

      return await fs.readJson(metadataPath);
    } catch (error) {
      logger.error(`Error loading metadata for feature ${name}:`, error);
      return null;
    }
  }

  /**
   * Work on the next issue in a feature
   */
  async workOnNextIssue(featureName: string): Promise<{
    success: boolean;
    message: string;
    issueNumber?: number;
  }> {
    try {
      if (!isValidFeatureName(featureName)) {
        throw new ValidationError(`Invalid feature name: ${featureName}`);
      }

      const featureStatus = await getFeatureDetails(featureName, this.config);
      if (!featureStatus) {
        return {
          success: false,
          message: `Feature ${featureName} not found`,
        };
      }

      const sortedIssues = sortIssuesByStep(featureStatus.issues);
      const nextIssue = await workOnNextIssue(featureStatus, sortedIssues);

      if (!nextIssue) {
        return {
          success: false,
          message: 'No open issues found for this feature',
        };
      }

      // Execute feature development for this issue
      await this.executeFeatureDevelopment(
        featureName,
        `Issue #${nextIssue.issueNumber} - ${nextIssue.stepText}`,
        false,
        [nextIssue.issueNumber],
      );

      return {
        success: true,
        message: `Started work on issue #${nextIssue.issueNumber}`,
        issueNumber: nextIssue.issueNumber,
      };
    } catch (error) {
      logger.error(`Error working on next issue for ${featureName}:`, error);
      throw error;
    }
  }

  /**
   * Work on a specific issue in a feature
   */
  async workOnSpecificIssue(
    featureName: string,
    request: WorkFeatureRequest,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Validate issue number is a positive integer
      if (!request.issueNumber || request.issueNumber <= 0 || !Number.isInteger(request.issueNumber)) {
        throw new ValidationError('Issue number must be a positive integer');
      }

      if (!isValidFeatureName(featureName)) {
        throw new ValidationError(`Invalid feature name: ${featureName}`);
      }

      const featureStatus = await getFeatureDetails(featureName, this.config);
      if (!featureStatus) {
        return {
          success: false,
          message: `Feature ${featureName} not found`,
        };
      }

      const selectedIssue = selectSpecificIssue(
        featureStatus.issues,
        request.issueNumber.toString(),
      );

      if (!selectedIssue) {
        return {
          success: false,
          message: `Issue #${request.issueNumber} not found or not available`,
        };
      }

      // Execute feature development for this issue
      await this.executeFeatureDevelopment(
        featureName,
        `Issue #${selectedIssue.number} - ${selectedIssue.title}`,
        false,
        [selectedIssue.number],
      );

      return {
        success: true,
        message: `Started work on issue #${selectedIssue.number}`,
      };
    } catch (error) {
      logger.error(
        `Error working on issue #${request.issueNumber} for ${featureName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add issues to a feature
   */
  async addIssuesToFeature(
    featureName: string,
    request: AddIssuesRequest,
  ): Promise<{
    success: boolean;
    message: string;
    addedIssues?: number[];
  }> {
    try {
      if (!isValidFeatureName(featureName)) {
        throw new ValidationError(`Invalid feature name: ${featureName}`);
      }

      const result = await addIssuesToFeature(
        featureName,
        request.issueNumbers,
        this.config.mainRepoPath,
      ) as any;

      if (result.success && result.success.length > 0) {
        return {
          success: true,
          message: `Successfully added ${result.success.length} issues to feature ${featureName}`,
          addedIssues: result.success,
        };
      } else {
        return {
          success: false,
          message: `Failed to add issues to feature ${featureName}`,
        };
      }
    } catch (error) {
      logger.error(`Error adding issues to feature ${featureName}:`, error);
      throw error;
    }
  }

  /**
   * Get worktree status for a feature
   */
  async getWorktreeStatus(featureName: string): Promise<{
    exists: boolean;
    path?: string;
    branch?: string;
    hasChanges?: boolean;
    filesChanged?: number;
  }> {
    try {
      if (!isValidFeatureName(featureName)) {
        throw new ValidationError(`Invalid feature name: ${featureName}`);
      }

      const projectName = path.basename(this.config.mainRepoPath);
      const worktreePath = path.join(
        this.config.baseWorktreePath,
        `${projectName}-${featureName}`,
      );

      try {
        await fs.access(worktreePath);
        const status = await getWorktreeStatus(worktreePath);
        if (status) {
          return {
            exists: true,
            path: worktreePath,
            branch: status.branch,
            hasChanges: status.hasChanges,
            filesChanged: status.recentCommits ? status.recentCommits.length : 0,
          };
        } else {
          return {
            exists: false,
          };
        }
      } catch {
        return {
          exists: false,
        };
      }
    } catch (error) {
      logger.error(`Error getting worktree status for ${featureName}:`, error);
      throw error;
    }
  }

  private async executeFeatureDevelopment(
    featureName: string,
    description: string,
    architectureMode: boolean,
    issueNumbers?: number[],
  ): Promise<void> {
    const config: OrchestratorConfig = {
      mainRepoPath: this.config.mainRepoPath,
      baseWorktreePath: this.config.baseWorktreePath,
      maxConcurrentTasks: this.config.maxConcurrentTasks || 2,
      requiredApprovals: this.config.requiredApprovals || 3,
      reviewerProfiles: this.config.reviewerProfiles || [
        'backend',
        'frontend',
        'devops',
      ],
    };

    try {
      this.orchestrator = new CoreOrchestrator(config, featureName);
    } catch (error) {
      logger.error(`Failed to initialize orchestrator for ${featureName}:`, error);
      throw new Error(`Failed to initialize orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (this.orchestrator) {
      await this.orchestrator
        .executeFeature({
          name: featureName,
          description,
          baseBranch: this.config.baseBranch || 'main',
          isParentFeature: architectureMode,
          architectureMode,
          issues: issueNumbers,
        })
        .catch((error: unknown) => {
          logger.error(
            `Feature development failed for ${featureName}:`,
            error,
          );
          throw error;
        });
    }
  }

  /**
   * Execute a feature development workflow
   */
  async executeFeature(
    featureName: string,
    request: ExecuteFeatureRequest
  ): Promise<{
    success: boolean;
    message: string;
    executionId?: string;
  }> {
    try {
      if (!isValidFeatureName(featureName)) {
        throw new ValidationError(`Invalid feature name: ${featureName}`);
      }

      // Check if feature exists
      const feature = await this.getFeature(featureName);
      if (!feature) {
        return {
          success: false,
          message: `Feature ${featureName} not found`,
        };
      }

      // Check if already running
      const currentStatus = this.executionStatus.get(featureName);
      if (currentStatus && currentStatus.status === 'running') {
        return {
          success: false,
          message: `Feature ${featureName} is already being executed`,
        };
      }

      // Add task to queue
      const executionId = await taskQueue.addTask(
        featureName,
        'execute',
        {
          architectureMode: request.architectureMode || false,
          issueNumbers: request.issueNumbers,
          description: feature.description,
        }
      );

      // Update execution status
      this.executionStatus.set(featureName, {
        featureName,
        status: 'queued',
        startTime: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Feature execution queued for ${featureName}`,
        executionId,
      };
    } catch (error) {
      logger.error(`Error executing feature ${featureName}:`, error);
      throw error;
    }
  }

  /**
   * Get execution status for a feature
   */
  async getExecutionStatus(featureName: string): Promise<ExecutionStatus | null> {
    return this.executionStatus.get(featureName) || null;
  }

  /**
   * Execute a task from the queue
   */
  private async executeTask(task: QueuedTask): Promise<void> {
    const { featureName, type, payload } = task;

    // Update execution status
    this.executionStatus.set(featureName, {
      featureName,
      status: 'running',
      startTime: new Date().toISOString(),
      currentStep: 'Initializing',
    });

    // Send SSE update
    sseService.sendToFeature(featureName, {
      event: 'execution:started',
      data: {
        featureName,
        taskId: task.id,
        type,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      if (type === 'execute') {
        await this.executeFeatureWithStreaming(
          featureName,
          payload.description as string,
          payload.architectureMode as boolean,
          payload.issueNumbers as number[] | undefined
        );
      } else if (type === 'work-issue') {
        await this.executeFeatureWithStreaming(
          featureName,
          `Working on issue ${payload.issueNumber}`,
          false,
          [payload.issueNumber as number]
        );
      }

      // Update execution status
      this.executionStatus.set(featureName, {
        featureName,
        status: 'completed',
        startTime: this.executionStatus.get(featureName)?.startTime,
        endTime: new Date().toISOString(),
      });

      // Send SSE update
      sseService.sendToFeature(featureName, {
        event: 'execution:completed',
        data: {
          featureName,
          taskId: task.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Update execution status
      this.executionStatus.set(featureName, {
        featureName,
        status: 'failed',
        startTime: this.executionStatus.get(featureName)?.startTime,
        endTime: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send SSE update
      sseService.sendToFeature(featureName, {
        event: 'execution:failed',
        data: {
          featureName,
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute feature with streaming output
   */
  private async executeFeatureWithStreaming(
    featureName: string,
    description: string,
    architectureMode: boolean,
    issueNumbers?: number[]
  ): Promise<void> {
    // Build command
    const scriptPath = path.join(this.config.mainRepoPath, 'run-feature');
    const args: string[] = [featureName, description];
    
    if (architectureMode) {
      args.push('--arch');
    }
    
    if (issueNumbers && issueNumbers.length > 0) {
      args.push(...issueNumbers.map(n => n.toString()));
    }

    return new Promise((resolve, reject) => {
      const child = spawn(scriptPath, args, {
        cwd: this.config.mainRepoPath,
        env: { ...process.env },
        shell: true,
      });

      // Stream stdout
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        logger.info(`[${featureName}] ${output}`);
        
        // Send output via SSE
        sseService.sendToFeature(featureName, {
          event: 'execution:output',
          data: {
            featureName,
            output,
            stream: 'stdout',
            timestamp: new Date().toISOString(),
          },
        });

        // Update current step if we can parse it
        this.updateCurrentStep(featureName, output);
      });

      // Stream stderr
      child.stderr?.on('data', (data) => {
        const output = data.toString();
        logger.error(`[${featureName}] ${output}`);
        
        // Send output via SSE
        sseService.sendToFeature(featureName, {
          event: 'execution:output',
          data: {
            featureName,
            output,
            stream: 'stderr',
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Handle process exit
      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`Feature execution for ${featureName} completed successfully`);
          resolve();
        } else {
          const error = new Error(`Feature execution failed with exit code ${code}`);
          logger.error(`Feature execution for ${featureName} failed:`, error);
          reject(error);
        }
      });

      // Handle errors
      child.on('error', (error) => {
        logger.error(`Failed to execute feature ${featureName}:`, error);
        reject(error);
      });
    });
  }

  /**
   * Update current step based on output
   */
  private updateCurrentStep(featureName: string, output: string): void {
    const status = this.executionStatus.get(featureName);
    if (!status) return;

    // Parse output for step indicators
    let currentStep: string | undefined;
    
    if (output.includes('Running architecture agent')) {
      currentStep = 'Running architecture agent';
    } else if (output.includes('Working on issue')) {
      const match = output.match(/Working on issue #(\d+)/);
      if (match) {
        currentStep = `Working on issue #${match[1]}`;
      }
    } else if (output.includes('Running solver agent')) {
      currentStep = 'Running solver agent';
    } else if (output.includes('Running reviewer agent')) {
      currentStep = 'Running reviewer agent';
    } else if (output.includes('Creating pull request')) {
      currentStep = 'Creating pull request';
    }

    if (currentStep) {
      status.currentStep = currentStep;
      this.executionStatus.set(featureName, status);
      
      // Send SSE update
      sseService.sendToFeature(featureName, {
        event: 'execution:step',
        data: {
          featureName,
          currentStep,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Set up task queue event listeners
   */
  private setupTaskQueueListeners(): void {
    taskQueue.on('task:queued', (task: QueuedTask) => {
      logger.info(`Task queued: ${task.id} for feature ${task.featureName}`);
    });

    taskQueue.on('task:started', (task: QueuedTask) => {
      logger.info(`Task started: ${task.id} for feature ${task.featureName}`);
    });

    taskQueue.on('task:completed', (task: QueuedTask) => {
      logger.info(`Task completed: ${task.id} for feature ${task.featureName}`);
    });

    taskQueue.on('task:failed', (task: QueuedTask) => {
      logger.error(`Task failed: ${task.id} for feature ${task.featureName}`, task.error);
    });

    taskQueue.on('task:retry', (task: QueuedTask) => {
      logger.warn(`Task retry: ${task.id} for feature ${task.featureName} (attempt ${task.retries})`);
    });
  }
}
