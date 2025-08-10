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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturesController = void 0;
const tsoa_1 = require("tsoa");
const FeaturesService_1 = require("../services/FeaturesService");
let FeaturesController = class FeaturesController extends tsoa_1.Controller {
    featuresService;
    constructor() {
        super();
        this.featuresService = new FeaturesService_1.FeaturesService();
    }
    /**
     * Get all features
     * @summary List all features in the system
     */
    async getFeatures() {
        return this.featuresService.getAllFeatures();
    }
    /**
     * Get a specific feature by name
     * @summary Get feature details
     */
    async getFeature(name) {
        const feature = await this.featuresService.getFeature(name);
        if (!feature) {
            this.setStatus(404);
            throw new Error(`Feature ${name} not found`);
        }
        return feature;
    }
    /**
     * Get issues for a specific feature
     * @summary List all issues for a feature
     */
    async getFeatureIssues(name, status) {
        return this.featuresService.getFeatureIssues(name, status);
    }
    /**
     * Create a new feature
     * @summary Create a new feature with optional architecture planning
     */
    async createFeature(request) {
        const feature = await this.featuresService.createFeature(request);
        this.setStatus(201);
        return feature;
    }
};
exports.FeaturesController = FeaturesController;
__decorate([
    (0, tsoa_1.Get)(),
    (0, tsoa_1.Response)(200, 'List of features'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "getFeatures", null);
__decorate([
    (0, tsoa_1.Get)('{name}'),
    (0, tsoa_1.Response)(200, 'Feature details'),
    (0, tsoa_1.Response)(404, 'Feature not found'),
    __param(0, (0, tsoa_1.Path)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "getFeature", null);
__decorate([
    (0, tsoa_1.Get)('{name}/issues'),
    (0, tsoa_1.Response)(200, 'List of issues'),
    (0, tsoa_1.Response)(404, 'Feature not found'),
    __param(0, (0, tsoa_1.Path)()),
    __param(1, (0, tsoa_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "getFeatureIssues", null);
__decorate([
    (0, tsoa_1.Post)(),
    (0, tsoa_1.Response)(201, 'Feature created'),
    (0, tsoa_1.Response)(400, 'Invalid request'),
    __param(0, (0, tsoa_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "createFeature", null);
exports.FeaturesController = FeaturesController = __decorate([
    (0, tsoa_1.Route)('features'),
    (0, tsoa_1.Tags)('Features'),
    __metadata("design:paramtypes", [])
], FeaturesController);
//# sourceMappingURL=FeaturesController.js.map