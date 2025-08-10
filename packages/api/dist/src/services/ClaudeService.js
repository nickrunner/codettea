"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ClaudeService {
    async checkConnection() {
        try {
            const { stdout } = await execAsync('claude --version', { timeout: 5000 });
            const version = stdout.trim();
            logger_1.logger.info(`Claude CLI version: ${version}`);
            return {
                connected: true,
                version,
                message: 'Claude CLI is available and ready'
            };
        }
        catch (error) {
            logger_1.logger.error('Claude CLI check failed:', error);
            return {
                connected: false,
                message: 'Claude CLI is not available. Please ensure it is installed and in PATH.'
            };
        }
    }
}
exports.ClaudeService = ClaudeService;
//# sourceMappingURL=ClaudeService.js.map