import {
  Feature,
  Issue,
  CreateFeatureRequest,
} from '../controllers/FeaturesController';
import {logger} from '../utils/logger';
import path from 'path';
import fs from 'fs-extra';
import {ValidationError} from '../utils/errors';
import {Orchestrator as CoreOrchestrator} from '@codettea/core';

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
}

interface Orchestrator {
  executeFeature(options: FeatureExecutionOptions): Promise<void>;
}

export class FeaturesService {
  private featuresPath = path.join(process.cwd(), '.codettea');
  private orchestrator: Orchestrator | null = null;

  async getAllFeatures(): Promise<Feature[]> {
    try {
      if (!(await fs.pathExists(this.featuresPath))) {
        return [];
      }

      const dirs = await fs.readdir(this.featuresPath);
      const features: Feature[] = [];

      for (const dir of dirs) {
        const featurePath = path.join(this.featuresPath, dir);
        const stat = await fs.stat(featurePath);

        if (stat.isDirectory()) {
          const feature = await this.loadFeatureMetadata(dir);
          if (feature) {
            features.push(feature);
          }
        }
      }

      return features;
    } catch (error) {
      logger.error('Error loading features:', error);
      return [];
    }
  }

  async getFeature(name: string): Promise<Feature | null> {
    try {
      // Validate input to prevent path traversal
      if (!this.isValidFeatureName(name)) {
        throw new ValidationError(`Invalid feature name: ${name}`);
      }
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
      // Validate input to prevent path traversal
      if (!this.isValidFeatureName(name)) {
        throw new ValidationError(`Invalid feature name: ${name}`);
      }
      const issuesPath = path.join(this.featuresPath, name, 'issues.json');

      // Try to read from local cache
      try {
        if (await fs.pathExists(issuesPath)) {
          const issues: Issue[] = await fs.readJson(issuesPath);

          if (status && status !== 'all') {
            return issues.filter(issue => issue.status === status);
          }

          return issues;
        }
      } catch (fsError) {
        logger.warn(`Could not read local issues for ${name}:`, fsError);
      }

      // Return empty array if no issues found
      return [];
    } catch (error) {
      logger.error(`Error loading issues for feature ${name}:`, error);
      return [];
    }
  }

  async createFeature(request: CreateFeatureRequest): Promise<Feature> {
    try {
      // Validate input
      if (!this.isValidFeatureName(request.name)) {
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
      if (!this.isValidFeatureName(name)) {
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

  private isValidFeatureName(name: string): boolean {
    // Prevent path traversal attacks
    if (!name || typeof name !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      '..',
      '/',
      '\\',
      '~',
      '%',
      ':',
      '*',
      '?',
      '"',
      '<',
      '>',
      '|',
    ];
    for (const pattern of dangerousPatterns) {
      if (name.includes(pattern)) {
        return false;
      }
    }

    // Ensure name matches a safe pattern (alphanumeric, dash, underscore only)
    const safePattern = /^[a-zA-Z0-9_-]+$/;
    return safePattern.test(name) && name.length <= 100;
  }
}
