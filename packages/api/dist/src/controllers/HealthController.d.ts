import { Controller } from 'tsoa';
interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
}
export declare class HealthController extends Controller {
    /**
     * Get the health status of the API
     * @summary Health check endpoint
     */
    getHealth(): Promise<HealthStatus>;
}
export {};
//# sourceMappingURL=HealthController.d.ts.map