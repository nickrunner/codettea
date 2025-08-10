"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const tsoa_1 = require("tsoa");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let HealthController = class HealthController extends tsoa_1.Controller {
    /**
     * Get the health status of the API with service connectivity checks
     * @summary Enhanced health check endpoint with dependency validation
     */
    async getHealth() {
        const services = [];
        // Check Claude CLI availability
        const claudeCheck = await this.checkClaude();
        services.push(claudeCheck);
        // Check GitHub CLI availability
        const githubCheck = await this.checkGitHub();
        services.push(githubCheck);
        // Check file system access
        const fileSystemCheck = await this.checkFileSystem();
        services.push(fileSystemCheck);
        // Check Git repository
        const gitCheck = await this.checkGitRepo();
        services.push(gitCheck);
        // Determine overall health status
        const unhealthyServices = services.filter(s => s.status === 'unhealthy');
        const degradedServices = services.filter(s => s.status === 'degraded');
        let overallStatus = 'healthy';
        if (unhealthyServices.length > 0) {
            overallStatus = 'unhealthy';
            this.setStatus(503);
        }
        else if (degradedServices.length > 0) {
            overallStatus = 'degraded';
            this.setStatus(503);
        }
        // Get memory usage
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const usedMem = memUsage.heapUsed + memUsage.external;
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            services,
            memory: {
                used: Math.round(usedMem / 1024 / 1024),
                total: Math.round(totalMem / 1024 / 1024),
                percentage: Math.round((usedMem / totalMem) * 100)
            },
            environment: process.env.NODE_ENV || 'development'
        };
    }
    async checkClaude() {
        const startTime = Date.now();
        try {
            const { stdout } = await execAsync('which claude', { timeout: 5000 });
            const responseTime = Date.now() - startTime;
            if (stdout.trim()) {
                return {
                    name: 'Claude CLI',
                    status: 'healthy',
                    message: 'Claude CLI is available',
                    responseTime
                };
            }
            return {
                name: 'Claude CLI',
                status: 'degraded',
                message: 'Claude CLI not found in PATH',
                responseTime
            };
        }
        catch (error) {
            logger_1.logger.error('Claude CLI check failed:', error);
            return {
                name: 'Claude CLI',
                status: 'unhealthy',
                message: `Claude CLI check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - startTime
            };
        }
    }
    async checkGitHub() {
        const startTime = Date.now();
        try {
            const { stdout } = await execAsync('gh auth status', { timeout: 5000 });
            const responseTime = Date.now() - startTime;
            if (stdout.includes('Logged in')) {
                return {
                    name: 'GitHub CLI',
                    status: 'healthy',
                    message: 'GitHub CLI is authenticated',
                    responseTime
                };
            }
            return {
                name: 'GitHub CLI',
                status: 'degraded',
                message: 'GitHub CLI not authenticated',
                responseTime
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // If gh is not installed, mark as degraded rather than unhealthy
            if (errorMessage.includes('command not found')) {
                return {
                    name: 'GitHub CLI',
                    status: 'degraded',
                    message: 'GitHub CLI not installed',
                    responseTime: Date.now() - startTime
                };
            }
            logger_1.logger.error('GitHub CLI check failed:', error);
            return {
                name: 'GitHub CLI',
                status: 'unhealthy',
                message: `GitHub CLI check failed: ${errorMessage}`,
                responseTime: Date.now() - startTime
            };
        }
    }
    async checkFileSystem() {
        const startTime = Date.now();
        try {
            // Try to access the project root
            await fs.access(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
            const responseTime = Date.now() - startTime;
            return {
                name: 'File System',
                status: 'healthy',
                message: 'File system is accessible',
                responseTime
            };
        }
        catch (error) {
            logger_1.logger.error('File system check failed:', error);
            return {
                name: 'File System',
                status: 'unhealthy',
                message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime: Date.now() - startTime
            };
        }
    }
    async checkGitRepo() {
        const startTime = Date.now();
        try {
            await execAsync('git status --short', { timeout: 5000 });
            const responseTime = Date.now() - startTime;
            return {
                name: 'Git Repository',
                status: 'healthy',
                message: 'Git repository is accessible',
                responseTime
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // If not in a git repo, mark as degraded
            if (errorMessage.includes('not a git repository')) {
                return {
                    name: 'Git Repository',
                    status: 'degraded',
                    message: 'Not in a git repository',
                    responseTime: Date.now() - startTime
                };
            }
            logger_1.logger.error('Git repository check failed:', error);
            return {
                name: 'Git Repository',
                status: 'unhealthy',
                message: `Git repository check failed: ${errorMessage}`,
                responseTime: Date.now() - startTime
            };
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, tsoa_1.Get)(),
    (0, tsoa_1.Response)(200, 'API is healthy'),
    (0, tsoa_1.Response)(503, 'API is unhealthy or degraded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, tsoa_1.Route)('health'),
    (0, tsoa_1.Tags)('Health')
], HealthController);
//# sourceMappingURL=HealthController.js.map