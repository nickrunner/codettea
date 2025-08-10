"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const logger_1 = require("../utils/logger");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ProjectsService {
    mainRepoPath = process.env.MAIN_REPO_PATH || process.cwd();
    async getAllProjects() {
        try {
            const project = {
                name: path_1.default.basename(this.mainRepoPath),
                path: this.mainRepoPath,
                isGitRepo: await this.isGitRepo(this.mainRepoPath)
            };
            if (project.isGitRepo) {
                project.currentBranch = await this.getCurrentBranch(this.mainRepoPath);
                project.remoteUrl = await this.getRemoteUrl(this.mainRepoPath);
            }
            return [project];
        }
        catch (error) {
            logger_1.logger.error('Error loading projects:', error);
            return [];
        }
    }
    async isGitRepo(repoPath) {
        try {
            await execAsync('git status', { cwd: repoPath });
            return true;
        }
        catch {
            return false;
        }
    }
    async getCurrentBranch(repoPath) {
        try {
            const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
            return stdout.trim();
        }
        catch (error) {
            logger_1.logger.error('Error getting current branch:', error);
            return 'unknown';
        }
    }
    async getRemoteUrl(repoPath) {
        try {
            const { stdout } = await execAsync('git remote get-url origin', { cwd: repoPath });
            return stdout.trim();
        }
        catch {
            return '';
        }
    }
}
exports.ProjectsService = ProjectsService;
//# sourceMappingURL=ProjectsService.js.map