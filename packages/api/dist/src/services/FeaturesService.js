"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturesService = void 0;
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class FeaturesService {
    featuresPath = path_1.default.join(process.cwd(), '.codettea');
    async getAllFeatures() {
        try {
            if (!await fs_extra_1.default.pathExists(this.featuresPath)) {
                return [];
            }
            const dirs = await fs_extra_1.default.readdir(this.featuresPath);
            const features = [];
            for (const dir of dirs) {
                const featurePath = path_1.default.join(this.featuresPath, dir);
                const stat = await fs_extra_1.default.stat(featurePath);
                if (stat.isDirectory()) {
                    const feature = await this.loadFeatureMetadata(dir);
                    if (feature) {
                        features.push(feature);
                    }
                }
            }
            return features;
        }
        catch (error) {
            logger_1.logger.error('Error loading features:', error);
            return [];
        }
    }
    async getFeature(name) {
        try {
            return await this.loadFeatureMetadata(name);
        }
        catch (error) {
            logger_1.logger.error(`Error loading feature ${name}:`, error);
            return null;
        }
    }
    async getFeatureIssues(name, status) {
        try {
            const issuesPath = path_1.default.join(this.featuresPath, name, 'issues.json');
            if (!await fs_extra_1.default.pathExists(issuesPath)) {
                return [];
            }
            const issues = await fs_extra_1.default.readJson(issuesPath);
            if (status && status !== 'all') {
                return issues.filter(issue => issue.status === status);
            }
            return issues;
        }
        catch (error) {
            logger_1.logger.error(`Error loading issues for feature ${name}:`, error);
            return [];
        }
    }
    async createFeature(request) {
        const feature = {
            name: request.name,
            description: request.description,
            status: 'planning',
            branch: `feature/${request.name}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const featurePath = path_1.default.join(this.featuresPath, request.name);
        await fs_extra_1.default.ensureDir(featurePath);
        await fs_extra_1.default.writeJson(path_1.default.join(featurePath, 'metadata.json'), feature, { spaces: 2 });
        if (request.architectureMode) {
            logger_1.logger.info(`Feature ${request.name} created with architecture mode enabled`);
        }
        return feature;
    }
    async loadFeatureMetadata(name) {
        const metadataPath = path_1.default.join(this.featuresPath, name, 'metadata.json');
        if (!await fs_extra_1.default.pathExists(metadataPath)) {
            return null;
        }
        return await fs_extra_1.default.readJson(metadataPath);
    }
}
exports.FeaturesService = FeaturesService;
//# sourceMappingURL=FeaturesService.js.map