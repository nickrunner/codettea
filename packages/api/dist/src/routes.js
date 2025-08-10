"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterRoutes = RegisterRoutes;
/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const runtime_1 = require("@tsoa/runtime");
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
const HealthController_1 = require("./controllers/HealthController");
const ClaudeController_1 = require("./controllers/ClaudeController");
const models = {};
const templateService = new runtime_1.ExpressTemplateService(models, { "noImplicitAdditionalProperties": "throw-on-extras", "bodyCoercion": true });
function RegisterRoutes(app) {
    app.get('/api/health', ...((0, runtime_1.fetchMiddlewares)(HealthController_1.HealthController)), ...((0, runtime_1.fetchMiddlewares)(HealthController_1.HealthController.prototype.getHealth)), async function HealthController_getHealth(_request, response, next) {
        const controller = new HealthController_1.HealthController();
        await templateService.apiHandler({
            methodName: 'getHealth',
            controller,
            response,
            next,
            validatedArgs: [],
            successStatus: undefined,
        });
    });
    app.get('/api/claude/status', ...((0, runtime_1.fetchMiddlewares)(ClaudeController_1.ClaudeController)), ...((0, runtime_1.fetchMiddlewares)(ClaudeController_1.ClaudeController.prototype.getClaudeStatus)), async function ClaudeController_getStatus(_request, response, next) {
        const controller = new ClaudeController_1.ClaudeController();
        await templateService.apiHandler({
            methodName: 'getClaudeStatus',
            controller,
            response,
            next,
            validatedArgs: [],
            successStatus: undefined,
        });
    });
}
//# sourceMappingURL=routes.js.map