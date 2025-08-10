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
exports.ConfigController = void 0;
const tsoa_1 = require("tsoa");
const ConfigService_1 = require("../services/ConfigService");
let ConfigController = class ConfigController extends tsoa_1.Controller {
    configService;
    constructor() {
        super();
        this.configService = new ConfigService_1.ConfigService();
    }
    /**
     * Get current system configuration
     * @summary Get the current configuration settings
     */
    async getConfig() {
        return this.configService.getConfiguration();
    }
};
exports.ConfigController = ConfigController;
__decorate([
    (0, tsoa_1.Get)(),
    (0, tsoa_1.Response)(200, 'Current configuration'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfigController.prototype, "getConfig", null);
exports.ConfigController = ConfigController = __decorate([
    (0, tsoa_1.Route)('config'),
    (0, tsoa_1.Tags)('Configuration'),
    __metadata("design:paramtypes", [])
], ConfigController);
//# sourceMappingURL=ConfigController.js.map