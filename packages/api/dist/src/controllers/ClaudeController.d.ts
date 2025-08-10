import { Controller } from 'tsoa';
interface ClaudeStatus {
    connected: boolean;
    version?: string;
    message: string;
    lastChecked: string;
}
export declare class ClaudeController extends Controller {
    private claudeService;
    constructor();
    /**
     * Test Claude CLI connection status
     * @summary Check if Claude CLI is available and properly configured
     */
    getClaudeStatus(): Promise<ClaudeStatus>;
}
export {};
//# sourceMappingURL=ClaudeController.d.ts.map