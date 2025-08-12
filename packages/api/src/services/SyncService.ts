import { 
  FeatureRepository, 
  IssueRepository, 
  WorktreeRepository, 
  SyncLogRepository 
} from '../database/repositories';
import { logger } from '../utils/logger';
import {
  getExistingFeatures,
  getFeatureIssues,
  getWorktreeStatus,
  type FeatureConfig
} from '@codettea/core';
import { execSync } from 'child_process';
import path from 'path';

export class SyncService {
  private featureRepo: FeatureRepository;
  private issueRepo: IssueRepository;
  private worktreeRepo: WorktreeRepository;
  private syncLogRepo: SyncLogRepository;
  private config: FeatureConfig;

  constructor() {
    this.featureRepo = new FeatureRepository();
    this.issueRepo = new IssueRepository();
    this.worktreeRepo = new WorktreeRepository();
    this.syncLogRepo = new SyncLogRepository();
    
    this.config = {
      mainRepoPath: process.env.MAIN_REPO_PATH || process.cwd(),
      baseWorktreePath: path.dirname(process.env.MAIN_REPO_PATH || process.cwd()),
      maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '2'),
      requiredApprovals: parseInt(process.env.REQUIRED_APPROVALS || '3'),
      reviewerProfiles: (process.env.REVIEWER_PROFILES || 'backend,frontend,devops').split(','),
      baseBranch: process.env.BASE_BRANCH || 'main',
    };
  }

  public async syncAllFeatures(): Promise<void> {
    try {
      logger.info('Starting full feature synchronization');
      
      const gitFeatures = await getExistingFeatures(this.config);
      
      for (const gitFeature of gitFeatures) {
        await this.syncFeature(gitFeature);
      }
      
      await this.markDeletedFeatures(gitFeatures.map((f: any) => f.name));
      
      this.syncLogRepo.logSuccess('feature', 0, 'sync', 'git', 
        JSON.stringify({ count: gitFeatures.length }));
      
      logger.info(`Synchronized ${gitFeatures.length} features`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Feature sync failed: ${errorMessage}`);
      this.syncLogRepo.logFailure('feature', 0, 'sync', 'git', errorMessage);
      throw error;
    }
  }

  private async syncFeature(gitFeature: any): Promise<void> {
    try {
      let dbFeature = this.featureRepo.findByName(gitFeature.name);
      
      if (!dbFeature) {
        dbFeature = this.featureRepo.create({
          name: gitFeature.name,
          description: gitFeature.description || '',
          status: 'in_progress',
          branch: gitFeature.branch,
          worktree_path: gitFeature.worktreePath
        });
        
        this.syncLogRepo.logSuccess('feature', dbFeature.id!, 'create', 'git');
      } else if (dbFeature.id) {
        this.featureRepo.update(dbFeature.id, {
          worktree_path: gitFeature.worktreePath,
          status: gitFeature.status || 'in_progress'
        });
        
        this.syncLogRepo.logSuccess('feature', dbFeature.id, 'update', 'git');
      }
      
      if (dbFeature.id) {
        await this.syncFeatureIssues(dbFeature.id, gitFeature.name);
        await this.syncWorktree(dbFeature.id, gitFeature);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to sync feature ${gitFeature.name}: ${errorMessage}`);
      throw error;
    }
  }

  private async syncFeatureIssues(featureId: number, featureName: string): Promise<void> {
    try {
      const gitIssues = await getFeatureIssues(featureName, this.config);
      
      for (const gitIssue of gitIssues) {
        let dbIssue = this.issueRepo.findByNumber(gitIssue.number);
        
        if (!dbIssue) {
          this.issueRepo.create({
            number: gitIssue.number,
            feature_id: featureId,
            title: gitIssue.title,
            description: gitIssue.body || '',
            status: gitIssue.state === 'closed' ? 'closed' : 'open',
            labels: gitIssue.labels?.join(','),
            step_number: gitIssue.stepNumber
          });
        } else if (dbIssue.id) {
          this.issueRepo.update(dbIssue.id, {
            feature_id: featureId,
            status: gitIssue.state === 'closed' ? 'closed' : 'open',
            labels: gitIssue.labels?.join(',')
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to sync issues for feature ${featureName}: ${errorMessage}`);
      throw error;
    }
  }

  private async syncWorktree(featureId: number, gitFeature: any): Promise<void> {
    try {
      const status = await getWorktreeStatus(gitFeature.worktreePath);
      
      let dbWorktree = this.worktreeRepo.findByFeatureId(featureId);
      
      if (!dbWorktree) {
        this.worktreeRepo.create({
          path: gitFeature.worktreePath,
          branch: gitFeature.branch,
          feature_id: featureId,
          exists: true,
          has_changes: status.hasChanges || false,
          files_changed: status.filesChanged || 0
        });
      } else if (dbWorktree.id) {
        this.worktreeRepo.update(dbWorktree.id, {
          has_changes: status.hasChanges || false,
          files_changed: status.filesChanged || 0,
          exists: true
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to sync worktree for feature: ${errorMessage}`);
      throw error;
    }
  }

  private async markDeletedFeatures(activeFeatureNames: string[]): Promise<void> {
    const allDbFeatures = this.featureRepo.findAll();
    
    for (const dbFeature of allDbFeatures) {
      if (!activeFeatureNames.includes(dbFeature.name) && 
          dbFeature.status !== 'archived' && 
          dbFeature.id) {
        this.featureRepo.update(dbFeature.id, { status: 'archived' });
        
        const worktree = this.worktreeRepo.findByFeatureId(dbFeature.id);
        if (worktree?.id) {
          this.worktreeRepo.markAsDeleted(worktree.id);
        }
      }
    }
  }

  public async syncGitHubIssues(featureName: string): Promise<void> {
    try {
      const feature = this.featureRepo.findByName(featureName);
      if (!feature?.id) {
        throw new Error(`Feature ${featureName} not found`);
      }
      
      const command = `gh issue list --label "feature:${featureName}" --json number,title,body,state,labels --limit 100`;
      const result = execSync(command, { encoding: 'utf-8' });
      const issues = JSON.parse(result);
      
      for (const issue of issues) {
        let dbIssue = this.issueRepo.findByNumber(issue.number);
        
        if (!dbIssue) {
          this.issueRepo.create({
            number: issue.number,
            feature_id: feature.id,
            title: issue.title,
            description: issue.body,
            status: issue.state === 'OPEN' ? 'open' : 'closed',
            labels: issue.labels.map((l: any) => l.name).join(',')
          });
        }
      }
      
      this.syncLogRepo.logSuccess('issue', feature.id, 'sync', 'github', 
        JSON.stringify({ count: issues.length }));
        
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`GitHub issue sync failed: ${errorMessage}`);
      this.syncLogRepo.logFailure('issue', 0, 'sync', 'github', errorMessage);
    }
  }

  public async invalidateCache(entityType: string, entityId?: number): Promise<void> {
    logger.info(`Invalidating cache for ${entityType}${entityId ? ` #${entityId}` : ''}`);
    
    switch (entityType) {
      case 'feature':
        if (entityId) {
          const feature = this.featureRepo.findById(entityId);
          if (feature) {
            await this.syncFeature(feature);
          }
        } else {
          await this.syncAllFeatures();
        }
        break;
        
      case 'issue':
        if (entityId) {
          const issue = this.issueRepo.findById(entityId);
          if (issue?.feature_id) {
            const feature = this.featureRepo.findById(issue.feature_id);
            if (feature) {
              await this.syncFeatureIssues(issue.feature_id, feature.name);
            }
          }
        }
        break;
        
      case 'worktree':
        const worktrees = this.worktreeRepo.findActiveWorktrees();
        for (const worktree of worktrees) {
          if (worktree.feature_id) {
            const feature = this.featureRepo.findById(worktree.feature_id);
            if (feature) {
              await this.syncWorktree(worktree.feature_id, { 
                name: feature.name, 
                worktreePath: worktree.path,
                branch: worktree.branch 
              });
            }
          }
        }
        break;
    }
  }

  public async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const deletedLogs = this.syncLogRepo.cleanOldLogs(daysToKeep);
    logger.info(`Cleaned up ${deletedLogs} old sync log entries`);
  }
}