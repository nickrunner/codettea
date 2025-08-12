import { Controller, Post, Route, Tags, Path, Body, Response } from 'tsoa';
import { SyncService } from '../services/SyncService';
import { logger } from '../utils/logger';

export interface CacheInvalidateRequest {
  entityType: 'feature' | 'issue' | 'worktree' | 'all';
  entityId?: number;
}

export interface CacheResponse {
  success: boolean;
  message: string;
}

@Route('cache')
@Tags('Cache')
export class CacheController extends Controller {
  private syncService: SyncService;

  constructor() {
    super();
    this.syncService = new SyncService();
  }

  /**
   * Invalidate cache for specific entity
   * @summary Invalidate cache
   */
  @Post('invalidate')
  @Response<CacheResponse>(200, 'Cache invalidated successfully')
  @Response<Error>(500, 'Internal server error')
  public async invalidateCache(
    @Body() request: CacheInvalidateRequest
  ): Promise<CacheResponse> {
    try {
      if (request.entityType === 'all') {
        await this.syncService.syncAllFeatures();
        return {
          success: true,
          message: 'All caches invalidated and synced successfully'
        };
      }
      
      await this.syncService.invalidateCache(request.entityType, request.entityId);
      
      return {
        success: true,
        message: `Cache invalidated for ${request.entityType}${request.entityId ? ` #${request.entityId}` : ''}`
      };
    } catch (error) {
      logger.error('Cache invalidation failed:', error);
      this.setStatus(500);
      throw error;
    }
  }

  /**
   * Sync all data from Git/GitHub
   * @summary Full sync
   */
  @Post('sync')
  @Response<CacheResponse>(200, 'Sync completed successfully')
  @Response<Error>(500, 'Internal server error')
  public async syncAll(): Promise<CacheResponse> {
    try {
      await this.syncService.syncAllFeatures();
      
      return {
        success: true,
        message: 'Full synchronization completed successfully'
      };
    } catch (error) {
      logger.error('Full sync failed:', error);
      this.setStatus(500);
      throw error;
    }
  }

  /**
   * Sync GitHub issues for a feature
   * @summary Sync GitHub issues
   */
  @Post('sync/github/{featureName}')
  @Response<CacheResponse>(200, 'GitHub sync completed successfully')
  @Response<Error>(500, 'Internal server error')
  public async syncGitHub(
    @Path() featureName: string
  ): Promise<CacheResponse> {
    try {
      await this.syncService.syncGitHubIssues(featureName);
      
      return {
        success: true,
        message: `GitHub issues synced for feature: ${featureName}`
      };
    } catch (error) {
      logger.error('GitHub sync failed:', error);
      this.setStatus(500);
      throw error;
    }
  }

  /**
   * Clean up old sync logs
   * @summary Clean old logs
   */
  @Post('cleanup')
  @Response<CacheResponse>(200, 'Cleanup completed successfully')
  @Response<Error>(500, 'Internal server error')
  public async cleanup(
    @Body() request: { daysToKeep?: number }
  ): Promise<CacheResponse> {
    try {
      await this.syncService.cleanupOldData(request.daysToKeep || 30);
      
      return {
        success: true,
        message: `Cleaned up logs older than ${request.daysToKeep || 30} days`
      };
    } catch (error) {
      logger.error('Cleanup failed:', error);
      this.setStatus(500);
      throw error;
    }
  }
}