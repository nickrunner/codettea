/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WorktreeController } from './controllers/WorktreeController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SystemController } from './controllers/SystemController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ProjectsController } from './controllers/ProjectsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MetricsController } from './controllers/MetricsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { HealthController } from './controllers/HealthController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FeaturesController } from './controllers/FeaturesController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ConfigController } from './controllers/ConfigController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ClaudeController } from './controllers/ClaudeController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CacheController } from './controllers/CacheController';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "Worktree": {
        "dataType": "refObject",
        "properties": {
            "path": {"dataType":"string","required":true},
            "branch": {"dataType":"string","required":true},
            "head": {"dataType":"string","required":true},
            "isMain": {"dataType":"boolean","required":true},
            "hasChanges": {"dataType":"boolean"},
            "filesChanged": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateWorktreeRequest": {
        "dataType": "refObject",
        "properties": {
            "featureName": {"dataType":"string","required":true},
            "branch": {"dataType":"string"},
            "baseBranch": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WorktreeCleanupResult": {
        "dataType": "refObject",
        "properties": {
            "removed": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "failed": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SystemStatus": {
        "dataType": "refObject",
        "properties": {
            "git": {"dataType":"nestedObjectLiteral","nestedProperties":{"version":{"dataType":"string"},"installed":{"dataType":"boolean","required":true}},"required":true},
            "github": {"dataType":"nestedObjectLiteral","nestedProperties":{"user":{"dataType":"string"},"authenticated":{"dataType":"boolean","required":true}},"required":true},
            "claude": {"dataType":"nestedObjectLiteral","nestedProperties":{"location":{"dataType":"string"},"available":{"dataType":"boolean","required":true}},"required":true},
            "worktrees": {"dataType":"nestedObjectLiteral","nestedProperties":{"paths":{"dataType":"array","array":{"dataType":"string"},"required":true},"count":{"dataType":"double","required":true}},"required":true},
            "currentBranch": {"dataType":"string","required":true},
            "defaultBranch": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.boolean_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"boolean"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BranchStatus": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "isLocal": {"dataType":"boolean","required":true},
            "isRemote": {"dataType":"boolean","required":true},
            "isCurrent": {"dataType":"boolean","required":true},
            "isMerged": {"dataType":"boolean"},
            "lastCommit": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BranchCleanupResult": {
        "dataType": "refObject",
        "properties": {
            "deleted": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "failed": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "skipped": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BranchCleanupRequest": {
        "dataType": "refObject",
        "properties": {
            "deleteMerged": {"dataType":"boolean"},
            "deleteRemote": {"dataType":"boolean"},
            "branches": {"dataType":"array","array":{"dataType":"string"}},
            "dryRun": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Project": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "path": {"dataType":"string","required":true},
            "isGitRepo": {"dataType":"boolean","required":true},
            "currentBranch": {"dataType":"string"},
            "remoteUrl": {"dataType":"string"},
            "hasClaudeConfig": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProjectConfig": {
        "dataType": "refObject",
        "properties": {
            "mainRepoPath": {"dataType":"string","required":true},
            "baseWorktreePath": {"dataType":"string","required":true},
            "maxConcurrentTasks": {"dataType":"double","required":true},
            "requiredApprovals": {"dataType":"double","required":true},
            "reviewerProfiles": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "baseBranch": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_ProjectConfig_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"mainRepoPath":{"dataType":"string"},"baseWorktreePath":{"dataType":"string"},"maxConcurrentTasks":{"dataType":"double"},"requiredApprovals":{"dataType":"double"},"reviewerProfiles":{"dataType":"array","array":{"dataType":"string"}},"baseBranch":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProjectBranch": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "isLocal": {"dataType":"boolean","required":true},
            "isRemote": {"dataType":"boolean","required":true},
            "isCurrent": {"dataType":"boolean","required":true},
            "isMerged": {"dataType":"boolean"},
            "lastCommit": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServiceCheck": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["healthy"]},{"dataType":"enum","enums":["unhealthy"]},{"dataType":"enum","enums":["degraded"]}],"required":true},
            "message": {"dataType":"string"},
            "responseTime": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HealthStatus": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["healthy"]},{"dataType":"enum","enums":["unhealthy"]},{"dataType":"enum","enums":["degraded"]}],"required":true},
            "timestamp": {"dataType":"string","required":true},
            "uptime": {"dataType":"double","required":true},
            "version": {"dataType":"string","required":true},
            "services": {"dataType":"array","array":{"dataType":"refObject","ref":"ServiceCheck"},"required":true},
            "memory": {"dataType":"nestedObjectLiteral","nestedProperties":{"percentage":{"dataType":"double","required":true},"total":{"dataType":"double","required":true},"used":{"dataType":"double","required":true}},"required":true},
            "environment": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Feature": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["planning"]},{"dataType":"enum","enums":["in_progress"]},{"dataType":"enum","enums":["completed"]},{"dataType":"enum","enums":["archived"]}],"required":true},
            "branch": {"dataType":"string","required":true},
            "worktreePath": {"dataType":"string"},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Issue": {
        "dataType": "refObject",
        "properties": {
            "number": {"dataType":"double","required":true},
            "title": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["open"]},{"dataType":"enum","enums":["closed"]},{"dataType":"enum","enums":["in_progress"]}],"required":true},
            "assignee": {"dataType":"string"},
            "labels": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateFeatureRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "architectureMode": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WorkFeatureRequest": {
        "dataType": "refObject",
        "properties": {
            "issueNumber": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AddIssuesRequest": {
        "dataType": "refObject",
        "properties": {
            "issueNumbers": {"dataType":"array","array":{"dataType":"double"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WorktreeStatus": {
        "dataType": "refObject",
        "properties": {
            "exists": {"dataType":"boolean","required":true},
            "path": {"dataType":"string"},
            "branch": {"dataType":"string"},
            "hasChanges": {"dataType":"boolean"},
            "filesChanged": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FeatureDetails": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["planning"]},{"dataType":"enum","enums":["in_progress"]},{"dataType":"enum","enums":["completed"]},{"dataType":"enum","enums":["archived"]}],"required":true},
            "branch": {"dataType":"string","required":true},
            "worktreePath": {"dataType":"string"},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "issues": {"dataType":"array","array":{"dataType":"refObject","ref":"Issue"},"required":true},
            "worktreeStatus": {"ref":"WorktreeStatus","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Configuration": {
        "dataType": "refObject",
        "properties": {
            "mainRepoPath": {"dataType":"string","required":true},
            "baseWorktreePath": {"dataType":"string","required":true},
            "maxConcurrentTasks": {"dataType":"double","required":true},
            "requiredApprovals": {"dataType":"double","required":true},
            "reviewerProfiles": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "claudeAvailable": {"dataType":"boolean","required":true},
            "githubAuthenticated": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClaudeStatus": {
        "dataType": "refObject",
        "properties": {
            "connected": {"dataType":"boolean","required":true},
            "version": {"dataType":"string"},
            "message": {"dataType":"string","required":true},
            "lastChecked": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CacheResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Error": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "stack": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CacheInvalidateRequest": {
        "dataType": "refObject",
        "properties": {
            "entityType": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["feature"]},{"dataType":"enum","enums":["issue"]},{"dataType":"enum","enums":["worktree"]},{"dataType":"enum","enums":["all"]}],"required":true},
            "entityId": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsWorktreeController_getWorktrees: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/worktrees',
            ...(fetchMiddlewares<RequestHandler>(WorktreeController)),
            ...(fetchMiddlewares<RequestHandler>(WorktreeController.prototype.getWorktrees)),

            async function WorktreeController_getWorktrees(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWorktreeController_getWorktrees, request, response });

                const controller = new WorktreeController();

              await templateService.apiHandler({
                methodName: 'getWorktrees',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWorktreeController_createWorktree: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"CreateWorktreeRequest"},
        };
        app.post('/api/worktrees',
            ...(fetchMiddlewares<RequestHandler>(WorktreeController)),
            ...(fetchMiddlewares<RequestHandler>(WorktreeController.prototype.createWorktree)),

            async function WorktreeController_createWorktree(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWorktreeController_createWorktree, request, response });

                const controller = new WorktreeController();

              await templateService.apiHandler({
                methodName: 'createWorktree',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWorktreeController_removeWorktree: Record<string, TsoaRoute.ParameterSchema> = {
                path: {"in":"path","name":"path","required":true,"dataType":"string"},
        };
        app.delete('/api/worktrees/:path',
            ...(fetchMiddlewares<RequestHandler>(WorktreeController)),
            ...(fetchMiddlewares<RequestHandler>(WorktreeController.prototype.removeWorktree)),

            async function WorktreeController_removeWorktree(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWorktreeController_removeWorktree, request, response });

                const controller = new WorktreeController();

              await templateService.apiHandler({
                methodName: 'removeWorktree',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWorktreeController_cleanupWorktrees: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/api/worktrees/cleanup',
            ...(fetchMiddlewares<RequestHandler>(WorktreeController)),
            ...(fetchMiddlewares<RequestHandler>(WorktreeController.prototype.cleanupWorktrees)),

            async function WorktreeController_cleanupWorktrees(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWorktreeController_cleanupWorktrees, request, response });

                const controller = new WorktreeController();

              await templateService.apiHandler({
                methodName: 'cleanupWorktrees',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWorktreeController_getWorktreeStatus: Record<string, TsoaRoute.ParameterSchema> = {
                path: {"in":"path","name":"path","required":true,"dataType":"string"},
        };
        app.get('/api/worktrees/:path/status',
            ...(fetchMiddlewares<RequestHandler>(WorktreeController)),
            ...(fetchMiddlewares<RequestHandler>(WorktreeController.prototype.getWorktreeStatus)),

            async function WorktreeController_getWorktreeStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWorktreeController_getWorktreeStatus, request, response });

                const controller = new WorktreeController();

              await templateService.apiHandler({
                methodName: 'getWorktreeStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSystemController_getSystemStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/system/status',
            ...(fetchMiddlewares<RequestHandler>(SystemController)),
            ...(fetchMiddlewares<RequestHandler>(SystemController.prototype.getSystemStatus)),

            async function SystemController_getSystemStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSystemController_getSystemStatus, request, response });

                const controller = new SystemController();

              await templateService.apiHandler({
                methodName: 'getSystemStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSystemController_getClaudeStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/system/claude-status',
            ...(fetchMiddlewares<RequestHandler>(SystemController)),
            ...(fetchMiddlewares<RequestHandler>(SystemController.prototype.getClaudeStatus)),

            async function SystemController_getClaudeStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSystemController_getClaudeStatus, request, response });

                const controller = new SystemController();

              await templateService.apiHandler({
                methodName: 'getClaudeStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSystemController_testConfiguration: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/api/system/test-config',
            ...(fetchMiddlewares<RequestHandler>(SystemController)),
            ...(fetchMiddlewares<RequestHandler>(SystemController.prototype.testConfiguration)),

            async function SystemController_testConfiguration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSystemController_testConfiguration, request, response });

                const controller = new SystemController();

              await templateService.apiHandler({
                methodName: 'testConfiguration',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSystemController_getBranchesStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/system/branches/status',
            ...(fetchMiddlewares<RequestHandler>(SystemController)),
            ...(fetchMiddlewares<RequestHandler>(SystemController.prototype.getBranchesStatus)),

            async function SystemController_getBranchesStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSystemController_getBranchesStatus, request, response });

                const controller = new SystemController();

              await templateService.apiHandler({
                methodName: 'getBranchesStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSystemController_cleanupBranches: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"BranchCleanupRequest"},
        };
        app.post('/api/system/branches/cleanup',
            ...(fetchMiddlewares<RequestHandler>(SystemController)),
            ...(fetchMiddlewares<RequestHandler>(SystemController.prototype.cleanupBranches)),

            async function SystemController_cleanupBranches(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSystemController_cleanupBranches, request, response });

                const controller = new SystemController();

              await templateService.apiHandler({
                methodName: 'cleanupBranches',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProjectsController_getProjects: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/projects',
            ...(fetchMiddlewares<RequestHandler>(ProjectsController)),
            ...(fetchMiddlewares<RequestHandler>(ProjectsController.prototype.getProjects)),

            async function ProjectsController_getProjects(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_getProjects, request, response });

                const controller = new ProjectsController();

              await templateService.apiHandler({
                methodName: 'getProjects',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProjectsController_getProjectConfig: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.get('/api/projects/:name/config',
            ...(fetchMiddlewares<RequestHandler>(ProjectsController)),
            ...(fetchMiddlewares<RequestHandler>(ProjectsController.prototype.getProjectConfig)),

            async function ProjectsController_getProjectConfig(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_getProjectConfig, request, response });

                const controller = new ProjectsController();

              await templateService.apiHandler({
                methodName: 'getProjectConfig',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProjectsController_updateProjectConfig: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
                config: {"in":"body","name":"config","required":true,"ref":"Partial_ProjectConfig_"},
        };
        app.put('/api/projects/:name/config',
            ...(fetchMiddlewares<RequestHandler>(ProjectsController)),
            ...(fetchMiddlewares<RequestHandler>(ProjectsController.prototype.updateProjectConfig)),

            async function ProjectsController_updateProjectConfig(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_updateProjectConfig, request, response });

                const controller = new ProjectsController();

              await templateService.apiHandler({
                methodName: 'updateProjectConfig',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProjectsController_selectProject: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.post('/api/projects/:name/select',
            ...(fetchMiddlewares<RequestHandler>(ProjectsController)),
            ...(fetchMiddlewares<RequestHandler>(ProjectsController.prototype.selectProject)),

            async function ProjectsController_selectProject(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_selectProject, request, response });

                const controller = new ProjectsController();

              await templateService.apiHandler({
                methodName: 'selectProject',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProjectsController_getProjectBranches: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.get('/api/projects/:name/branches',
            ...(fetchMiddlewares<RequestHandler>(ProjectsController)),
            ...(fetchMiddlewares<RequestHandler>(ProjectsController.prototype.getProjectBranches)),

            async function ProjectsController_getProjectBranches(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_getProjectBranches, request, response });

                const controller = new ProjectsController();

              await templateService.apiHandler({
                methodName: 'getProjectBranches',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProjectsController_getDefaultBranch: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.get('/api/projects/:name/default-branch',
            ...(fetchMiddlewares<RequestHandler>(ProjectsController)),
            ...(fetchMiddlewares<RequestHandler>(ProjectsController.prototype.getDefaultBranch)),

            async function ProjectsController_getDefaultBranch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProjectsController_getDefaultBranch, request, response });

                const controller = new ProjectsController();

              await templateService.apiHandler({
                methodName: 'getDefaultBranch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getMetrics: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/metrics',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getMetrics)),

            async function MetricsController_getMetrics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getMetrics, request, response });

                const controller = new MetricsController();

              await templateService.apiHandler({
                methodName: 'getMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getHealthMetrics: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/metrics/health',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getHealthMetrics)),

            async function MetricsController_getHealthMetrics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getHealthMetrics, request, response });

                const controller = new MetricsController();

              await templateService.apiHandler({
                methodName: 'getHealthMetrics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsHealthController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/health',
            ...(fetchMiddlewares<RequestHandler>(HealthController)),
            ...(fetchMiddlewares<RequestHandler>(HealthController.prototype.getHealth)),

            async function HealthController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsHealthController_getHealth, request, response });

                const controller = new HealthController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_getFeatures: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/features',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.getFeatures)),

            async function FeaturesController_getFeatures(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeatures, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'getFeatures',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_getFeature: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.get('/api/features/:name',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.getFeature)),

            async function FeaturesController_getFeature(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeature, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'getFeature',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_getFeatureIssues: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
                status: {"in":"query","name":"status","dataType":"union","subSchemas":[{"dataType":"enum","enums":["open"]},{"dataType":"enum","enums":["closed"]},{"dataType":"enum","enums":["all"]}]},
        };
        app.get('/api/features/:name/issues',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.getFeatureIssues)),

            async function FeaturesController_getFeatureIssues(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeatureIssues, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'getFeatureIssues',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_createFeature: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"CreateFeatureRequest"},
        };
        app.post('/api/features',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.createFeature)),

            async function FeaturesController_createFeature(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_createFeature, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'createFeature',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_getActiveFeatures: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/features/active',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.getActiveFeatures)),

            async function FeaturesController_getActiveFeatures(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getActiveFeatures, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'getActiveFeatures',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_workOnNextIssue: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.post('/api/features/:name/work-next',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.workOnNextIssue)),

            async function FeaturesController_workOnNextIssue(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_workOnNextIssue, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'workOnNextIssue',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_workOnSpecificIssue: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
                request: {"in":"body","name":"request","required":true,"ref":"WorkFeatureRequest"},
        };
        app.post('/api/features/:name/work-issue',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.workOnSpecificIssue)),

            async function FeaturesController_workOnSpecificIssue(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_workOnSpecificIssue, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'workOnSpecificIssue',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_addIssuesToFeature: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
                request: {"in":"body","name":"request","required":true,"ref":"AddIssuesRequest"},
        };
        app.post('/api/features/:name/add-issues',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.addIssuesToFeature)),

            async function FeaturesController_addIssuesToFeature(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_addIssuesToFeature, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'addIssuesToFeature',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_getFeatureDetails: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.get('/api/features/:name/details',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.getFeatureDetails)),

            async function FeaturesController_getFeatureDetails(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getFeatureDetails, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'getFeatureDetails',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsFeaturesController_getWorktreeStatus: Record<string, TsoaRoute.ParameterSchema> = {
                name: {"in":"path","name":"name","required":true,"dataType":"string"},
        };
        app.get('/api/features/:name/worktree-status',
            ...(fetchMiddlewares<RequestHandler>(FeaturesController)),
            ...(fetchMiddlewares<RequestHandler>(FeaturesController.prototype.getWorktreeStatus)),

            async function FeaturesController_getWorktreeStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFeaturesController_getWorktreeStatus, request, response });

                const controller = new FeaturesController();

              await templateService.apiHandler({
                methodName: 'getWorktreeStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsConfigController_getConfig: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/config',
            ...(fetchMiddlewares<RequestHandler>(ConfigController)),
            ...(fetchMiddlewares<RequestHandler>(ConfigController.prototype.getConfig)),

            async function ConfigController_getConfig(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConfigController_getConfig, request, response });

                const controller = new ConfigController();

              await templateService.apiHandler({
                methodName: 'getConfig',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClaudeController_getClaudeStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/claude/status',
            ...(fetchMiddlewares<RequestHandler>(ClaudeController)),
            ...(fetchMiddlewares<RequestHandler>(ClaudeController.prototype.getClaudeStatus)),

            async function ClaudeController_getClaudeStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClaudeController_getClaudeStatus, request, response });

                const controller = new ClaudeController();

              await templateService.apiHandler({
                methodName: 'getClaudeStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCacheController_invalidateCache: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"CacheInvalidateRequest"},
        };
        app.post('/api/cache/invalidate',
            ...(fetchMiddlewares<RequestHandler>(CacheController)),
            ...(fetchMiddlewares<RequestHandler>(CacheController.prototype.invalidateCache)),

            async function CacheController_invalidateCache(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCacheController_invalidateCache, request, response });

                const controller = new CacheController();

              await templateService.apiHandler({
                methodName: 'invalidateCache',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCacheController_syncAll: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/api/cache/sync',
            ...(fetchMiddlewares<RequestHandler>(CacheController)),
            ...(fetchMiddlewares<RequestHandler>(CacheController.prototype.syncAll)),

            async function CacheController_syncAll(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCacheController_syncAll, request, response });

                const controller = new CacheController();

              await templateService.apiHandler({
                methodName: 'syncAll',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCacheController_syncGitHub: Record<string, TsoaRoute.ParameterSchema> = {
                featureName: {"in":"path","name":"featureName","required":true,"dataType":"string"},
        };
        app.post('/api/cache/sync/github/:featureName',
            ...(fetchMiddlewares<RequestHandler>(CacheController)),
            ...(fetchMiddlewares<RequestHandler>(CacheController.prototype.syncGitHub)),

            async function CacheController_syncGitHub(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCacheController_syncGitHub, request, response });

                const controller = new CacheController();

              await templateService.apiHandler({
                methodName: 'syncGitHub',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCacheController_cleanup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"daysToKeep":{"dataType":"double"}}},
        };
        app.post('/api/cache/cleanup',
            ...(fetchMiddlewares<RequestHandler>(CacheController)),
            ...(fetchMiddlewares<RequestHandler>(CacheController.prototype.cleanup)),

            async function CacheController_cleanup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCacheController_cleanup, request, response });

                const controller = new CacheController();

              await templateService.apiHandler({
                methodName: 'cleanup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
