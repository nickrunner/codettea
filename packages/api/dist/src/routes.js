"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterRoutes = RegisterRoutes;
const runtime_1 = require("@tsoa/runtime");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const ProjectsController_1 = require("./controllers/ProjectsController");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const MetricsController_1 = require("./controllers/MetricsController");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const HealthController_1 = require("./controllers/HealthController");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const FeaturesController_1 = require("./controllers/FeaturesController");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const ConfigController_1 = require("./controllers/ConfigController");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const ClaudeController_1 = require("./controllers/ClaudeController");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const models = {
    "Project": {
        "dataType": "refObject",
        "properties": {
            "name": { "dataType": "string", "required": true },
            "path": { "dataType": "string", "required": true },
            "isGitRepo": { "dataType": "boolean", "required": true },
            "currentBranch": { "dataType": "string" },
            "remoteUrl": { "dataType": "string" },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServiceCheck": {
        "dataType": "refObject",
        "properties": {
            "name": { "dataType": "string", "required": true },
            "status": { "dataType": "union", "subSchemas": [{ "dataType": "enum", "enums": ["healthy"] }, { "dataType": "enum", "enums": ["unhealthy"] }, { "dataType": "enum", "enums": ["degraded"] }], "required": true },
            "message": { "dataType": "string" },
            "responseTime": { "dataType": "double" },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HealthStatus": {
        "dataType": "refObject",
        "properties": {
            "status": { "dataType": "union", "subSchemas": [{ "dataType": "enum", "enums": ["healthy"] }, { "dataType": "enum", "enums": ["unhealthy"] }, { "dataType": "enum", "enums": ["degraded"] }], "required": true },
            "timestamp": { "dataType": "string", "required": true },
            "uptime": { "dataType": "double", "required": true },
            "version": { "dataType": "string", "required": true },
            "services": { "dataType": "array", "array": { "dataType": "refObject", "ref": "ServiceCheck" }, "required": true },
            "memory": { "dataType": "nestedObjectLiteral", "nestedProperties": { "percentage": { "dataType": "double", "required": true }, "total": { "dataType": "double", "required": true }, "used": { "dataType": "double", "required": true } }, "required": true },
            "environment": { "dataType": "string", "required": true },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Feature": {
        "dataType": "refObject",
        "properties": {
            "name": { "dataType": "string", "required": true },
            "description": { "dataType": "string", "required": true },
            "status": { "dataType": "union", "subSchemas": [{ "dataType": "enum", "enums": ["planning"] }, { "dataType": "enum", "enums": ["in_progress"] }, { "dataType": "enum", "enums": ["completed"] }, { "dataType": "enum", "enums": ["archived"] }], "required": true },
            "branch": { "dataType": "string", "required": true },
            "worktreePath": { "dataType": "string" },
            "createdAt": { "dataType": "string", "required": true },
            "updatedAt": { "dataType": "string", "required": true },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Issue": {
        "dataType": "refObject",
        "properties": {
            "number": { "dataType": "double", "required": true },
            "title": { "dataType": "string", "required": true },
            "status": { "dataType": "union", "subSchemas": [{ "dataType": "enum", "enums": ["open"] }, { "dataType": "enum", "enums": ["closed"] }, { "dataType": "enum", "enums": ["in_progress"] }], "required": true },
            "assignee": { "dataType": "string" },
            "labels": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "createdAt": { "dataType": "string", "required": true },
            "updatedAt": { "dataType": "string", "required": true },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateFeatureRequest": {
        "dataType": "refObject",
        "properties": {
            "name": { "dataType": "string", "required": true },
            "description": { "dataType": "string", "required": true },
            "architectureMode": { "dataType": "boolean" },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Configuration": {
        "dataType": "refObject",
        "properties": {
            "mainRepoPath": { "dataType": "string", "required": true },
            "baseWorktreePath": { "dataType": "string", "required": true },
            "maxConcurrentTasks": { "dataType": "double", "required": true },
            "requiredApprovals": { "dataType": "double", "required": true },
            "reviewerProfiles": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "claudeAvailable": { "dataType": "boolean", "required": true },
            "githubAuthenticated": { "dataType": "boolean", "required": true },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClaudeStatus": {
        "dataType": "refObject",
        "properties": {
            "connected": { "dataType": "boolean", "required": true },
            "version": { "dataType": "string" },
            "message": { "dataType": "string", "required": true },
            "lastChecked": { "dataType": "string", "required": true },
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new runtime_1.ExpressTemplateService(models, { "noImplicitAdditionalProperties": "throw-on-extras", "bodyCoercion": true });
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
function RegisterRoutes(app) {
    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################
    const argsProjectsController_getProjects = {};
    app.get('/api/projects', ...((0, runtime_1.fetchMiddlewares)(ProjectsController_1.ProjectsController)), ...((0, runtime_1.fetchMiddlewares)(ProjectsController_1.ProjectsController.prototype.getProjects)), async function ProjectsController_getProjects(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_getProjects, request, response });
            const controller = new ProjectsController_1.ProjectsController();
            await templateService.apiHandler({
                methodName: 'getProjects',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsMetricsController_getMetrics = {};
    app.get('/api/metrics', ...((0, runtime_1.fetchMiddlewares)(MetricsController_1.MetricsController)), ...((0, runtime_1.fetchMiddlewares)(MetricsController_1.MetricsController.prototype.getMetrics)), async function MetricsController_getMetrics(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getMetrics, request, response });
            const controller = new MetricsController_1.MetricsController();
            await templateService.apiHandler({
                methodName: 'getMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsMetricsController_getHealthMetrics = {};
    app.get('/api/metrics/health', ...((0, runtime_1.fetchMiddlewares)(MetricsController_1.MetricsController)), ...((0, runtime_1.fetchMiddlewares)(MetricsController_1.MetricsController.prototype.getHealthMetrics)), async function MetricsController_getHealthMetrics(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getHealthMetrics, request, response });
            const controller = new MetricsController_1.MetricsController();
            await templateService.apiHandler({
                methodName: 'getHealthMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsHealthController_getHealth = {};
    app.get('/api/health', ...((0, runtime_1.fetchMiddlewares)(HealthController_1.HealthController)), ...((0, runtime_1.fetchMiddlewares)(HealthController_1.HealthController.prototype.getHealth)), async function HealthController_getHealth(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsHealthController_getHealth, request, response });
            const controller = new HealthController_1.HealthController();
            await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsFeaturesController_getFeatures = {};
    app.get('/api/features', ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController)), ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController.prototype.getFeatures)), async function FeaturesController_getFeatures(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeatures, request, response });
            const controller = new FeaturesController_1.FeaturesController();
            await templateService.apiHandler({
                methodName: 'getFeatures',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsFeaturesController_getFeature = {
        name: { "in": "path", "name": "name", "required": true, "dataType": "string" },
    };
    app.get('/api/features/:name', ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController)), ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController.prototype.getFeature)), async function FeaturesController_getFeature(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeature, request, response });
            const controller = new FeaturesController_1.FeaturesController();
            await templateService.apiHandler({
                methodName: 'getFeature',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsFeaturesController_getFeatureIssues = {
        name: { "in": "path", "name": "name", "required": true, "dataType": "string" },
        status: { "in": "query", "name": "status", "dataType": "union", "subSchemas": [{ "dataType": "enum", "enums": ["open"] }, { "dataType": "enum", "enums": ["closed"] }, { "dataType": "enum", "enums": ["all"] }] },
    };
    app.get('/api/features/:name/issues', ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController)), ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController.prototype.getFeatureIssues)), async function FeaturesController_getFeatureIssues(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeatureIssues, request, response });
            const controller = new FeaturesController_1.FeaturesController();
            await templateService.apiHandler({
                methodName: 'getFeatureIssues',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsFeaturesController_createFeature = {
        request: { "in": "body", "name": "request", "required": true, "ref": "CreateFeatureRequest" },
    };
    app.post('/api/features', ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController)), ...((0, runtime_1.fetchMiddlewares)(FeaturesController_1.FeaturesController.prototype.createFeature)), async function FeaturesController_createFeature(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_createFeature, request, response });
            const controller = new FeaturesController_1.FeaturesController();
            await templateService.apiHandler({
                methodName: 'createFeature',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsConfigController_getConfig = {};
    app.get('/api/config', ...((0, runtime_1.fetchMiddlewares)(ConfigController_1.ConfigController)), ...((0, runtime_1.fetchMiddlewares)(ConfigController_1.ConfigController.prototype.getConfig)), async function ConfigController_getConfig(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsConfigController_getConfig, request, response });
            const controller = new ConfigController_1.ConfigController();
            await templateService.apiHandler({
                methodName: 'getConfig',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    const argsClaudeController_getClaudeStatus = {};
    app.get('/api/claude/status', ...((0, runtime_1.fetchMiddlewares)(ClaudeController_1.ClaudeController)), ...((0, runtime_1.fetchMiddlewares)(ClaudeController_1.ClaudeController.prototype.getClaudeStatus)), async function ClaudeController_getClaudeStatus(request, response, next) {
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        let validatedArgs = [];
        try {
            validatedArgs = templateService.getValidatedArgs({ args: argsClaudeController_getClaudeStatus, request, response });
            const controller = new ClaudeController_1.ClaudeController();
            await templateService.apiHandler({
                methodName: 'getClaudeStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
            });
        }
        catch (err) {
            return next(err);
        }
    });
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
//# sourceMappingURL=routes.js.map