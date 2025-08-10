/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TsoaRoute, fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { HealthController } from './controllers/HealthController';
import { ClaudeController } from './controllers/ClaudeController';
// import { FeaturesController } from './controllers/FeaturesController';
// import { ProjectsController } from './controllers/ProjectsController';
// import { ConfigController } from './controllers/ConfigController';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const models: TsoaRoute.Models = {};

const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

export function RegisterRoutes(app: Router) {
    app.get('/api/health',
        ...(fetchMiddlewares<RequestHandler>(HealthController)),
        ...(fetchMiddlewares<RequestHandler>(HealthController.prototype.getHealth)),

        async function HealthController_getHealth(_request: ExRequest, response: ExResponse, next: any) {
            const controller = new HealthController();

            await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs: [],
                successStatus: undefined,
            });
        }
    );
    
    app.get('/api/claude/status',
        ...(fetchMiddlewares<RequestHandler>(ClaudeController)),
        ...(fetchMiddlewares<RequestHandler>(ClaudeController.prototype.getClaudeStatus)),

        async function ClaudeController_getStatus(_request: ExRequest, response: ExResponse, next: any) {
            const controller = new ClaudeController();

            await templateService.apiHandler({
                methodName: 'getClaudeStatus',
                controller,
                response,
                next,
                validatedArgs: [],
                successStatus: undefined,
            });
        }
    );
}