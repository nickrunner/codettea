import { Feature, Issue, CreateFeatureRequest } from '../controllers/FeaturesController';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs-extra';

export class FeaturesService {
  private featuresPath = path.join(process.cwd(), '.codettea');

  async getAllFeatures(): Promise<Feature[]> {
    try {
      if (!await fs.pathExists(this.featuresPath)) {
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
      return await this.loadFeatureMetadata(name);
    } catch (error) {
      logger.error(`Error loading feature ${name}:`, error);
      return null;
    }
  }

  async getFeatureIssues(name: string, status?: 'open' | 'closed' | 'all'): Promise<Issue[]> {
    try {
      const issuesPath = path.join(this.featuresPath, name, 'issues.json');
      
      if (!await fs.pathExists(issuesPath)) {
        return [];
      }

      const issues: Issue[] = await fs.readJson(issuesPath);
      
      if (status && status !== 'all') {
        return issues.filter(issue => issue.status === status);
      }

      return issues;
    } catch (error) {
      logger.error(`Error loading issues for feature ${name}:`, error);
      return [];
    }
  }

  async createFeature(request: CreateFeatureRequest): Promise<Feature> {
    const feature: Feature = {
      name: request.name,
      description: request.description,
      status: 'planning',
      branch: `feature/${request.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const featurePath = path.join(this.featuresPath, request.name);
    await fs.ensureDir(featurePath);
    await fs.writeJson(path.join(featurePath, 'metadata.json'), feature, { spaces: 2 });

    if (request.architectureMode) {
      logger.info(`Feature ${request.name} created with architecture mode enabled`);
    }

    return feature;
  }

  private async loadFeatureMetadata(name: string): Promise<Feature | null> {
    const metadataPath = path.join(this.featuresPath, name, 'metadata.json');
    
    if (!await fs.pathExists(metadataPath)) {
      return null;
    }

    return await fs.readJson(metadataPath);
  }
}