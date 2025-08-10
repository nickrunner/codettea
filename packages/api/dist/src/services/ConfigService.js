"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const ClaudeService_1 = require("./ClaudeService");
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ConfigService {
    claudeService;
    constructor() {
        this.claudeService = new ClaudeService_1.ClaudeService();
    }
    async getConfiguration() {
        const [claudeStatus, githubAuth] = await Promise.all([
            this.claudeService.checkConnection(),
            this.checkGithubAuth()
        ]);
        return {
            mainRepoPath: process.env.MAIN_REPO_PATH || process.cwd(),
            baseWorktreePath: process.env.BASE_WORKTREE_PATH || '/Users/nickschrock/git',
            maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '2'),
            requiredApprovals: parseInt(process.env.REQUIRED_APPROVALS || '3'),
            reviewerProfiles: (process.env.REVIEWER_PROFILES || 'frontend,backend,devops').split(','),
            claudeAvailable: claudeStatus.connected,
            githubAuthenticated: githubAuth
        };
    }
    async checkGithubAuth() {
        try {
            const { stdout } = await execAsync('gh auth status', { timeout: 5000 });
            return stdout.includes('Logged in');
        }
        catch (error) {
            logger_1.logger.warn('GitHub CLI not authenticated');
            return false;
        }
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=ConfigService.js.map