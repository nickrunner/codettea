import { Controller, Get, Route, Tags, Response } from 'tsoa';
import { metricsRegistry, getHealthMetrics } from '../utils/metrics';

@Route('metrics')
@Tags('Metrics')
export class MetricsController extends Controller {
  /**
   * Get Prometheus metrics
   * @summary Prometheus metrics endpoint for monitoring
   */
  @Get()
  @Response(200, 'Metrics retrieved successfully')
  public async getMetrics(): Promise<string> {
    // Set the content type for Prometheus
    this.setHeader('Content-Type', metricsRegistry.contentType);
    
    // Return metrics in Prometheus format
    return await metricsRegistry.metrics();
  }
  
  /**
   * Get custom health metrics
   * @summary Get detailed health metrics in JSON format
   */
  @Get('health')
  @Response(200, 'Health metrics retrieved successfully')
  public async getHealthMetrics(): Promise<any> {
    return getHealthMetrics();
  }
}