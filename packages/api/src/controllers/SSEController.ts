import { Controller, Get, Route, Tags } from 'tsoa';
import { sseService } from '../services/SSEService';
import { taskQueue } from '../services/TaskQueueService';
import { logger } from '../utils/logger';

@Route('sse')
@Tags('Server-Sent Events')
export class SSEController extends Controller {
  /**
   * Get SSE connection statistics
   * @summary Get information about active SSE connections
   */
  @Get('stats')
  public async getSSEStats(): Promise<{
    totalClients: number;
    featureClients: Record<string, number>;
    taskQueueStats: Record<string, number>;
  }> {
    const stats = taskQueue.getStats();
    
    // Get feature client counts
    const featureClients: Record<string, number> = {};
    // This would need to be enhanced in SSEService to track per-feature clients
    
    return {
      totalClients: sseService.getClientCount(),
      featureClients,
      taskQueueStats: stats,
    };
  }
}