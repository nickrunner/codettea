import { Controller } from 'tsoa';
export interface Configuration {
    mainRepoPath: string;
    baseWorktreePath: string;
    maxConcurrentTasks: number;
    requiredApprovals: number;
    reviewerProfiles: string[];
    claudeAvailable: boolean;
    githubAuthenticated: boolean;
}
export declare class ConfigController extends Controller {
    private configService;
    constructor();
    /**
     * Get current system configuration
     * @summary Get the current configuration settings
     */
    getConfig(): Promise<Configuration>;
}
//# sourceMappingURL=ConfigController.d.ts.map