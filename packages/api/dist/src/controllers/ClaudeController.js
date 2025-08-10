"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeController = void 0;
const tsoa_1 = require("tsoa");
const ClaudeService_1 = require("../services/ClaudeService");
let ClaudeController = class ClaudeController extends tsoa_1.Controller {
    claudeService;
    constructor() {
        super();
        this.claudeService = new ClaudeService_1.ClaudeService();
    }
    /**
     * Test Claude CLI connection status
     * @summary Check if Claude CLI is available and properly configured
     */
    async getClaudeStatus() {
        const status = await this.claudeService.checkConnection();
        return {
            ...status,
            lastChecked: new Date().toISOString()
        };
    }
};
exports.ClaudeController = ClaudeController;
__decorate([
    (0, tsoa_1.Get)('status'),
    (0, tsoa_1.Response)(200, 'Claude connection status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClaudeController.prototype, "getClaudeStatus", null);
exports.ClaudeController = ClaudeController = __decorate([
    (0, tsoa_1.Route)('claude'),
    (0, tsoa_1.Tags)('Claude'),
    __metadata("design:paramtypes", [])
], ClaudeController);
//# sourceMappingURL=ClaudeController.js.map