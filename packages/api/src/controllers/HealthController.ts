import { Controller, Get, Route, Tags, Response } from 'tsoa';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

@Route('health')
@Tags('Health')
export class HealthController extends Controller {
  /**
   * Get the health status of the API
   * @summary Health check endpoint
   */
  @Get()
  @Response<HealthStatus>(200, 'API is healthy')
  public async getHealth(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}