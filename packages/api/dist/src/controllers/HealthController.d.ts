import { Controller } from 'tsoa';
interface ServiceCheck {
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    responseTime?: number;
}
interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    version: string;
    services: ServiceCheck[];
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    environment: string;
}
export declare class HealthController extends Controller {
    /**
     * Get the health status of the API with service connectivity checks
     * @summary Enhanced health check endpoint with dependency validation
     */
    getHealth(): Promise<HealthStatus>;
    private checkClaude;
    private checkGitHub;
    private checkFileSystem;
    private checkGitRepo;
}
export {};
//# sourceMappingURL=HealthController.d.ts.map