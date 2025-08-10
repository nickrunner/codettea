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
exports.ProjectsController = void 0;
const tsoa_1 = require("tsoa");
const ProjectsService_1 = require("../services/ProjectsService");
let ProjectsController = class ProjectsController extends tsoa_1.Controller {
    projectsService;
    constructor() {
        super();
        this.projectsService = new ProjectsService_1.ProjectsService();
    }
    /**
     * Get all available projects
     * @summary List all projects configured in the system
     */
    async getProjects() {
        return this.projectsService.getAllProjects();
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, tsoa_1.Get)(),
    (0, tsoa_1.Response)(200, 'List of projects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getProjects", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, tsoa_1.Route)('projects'),
    (0, tsoa_1.Tags)('Projects'),
    __metadata("design:paramtypes", [])
], ProjectsController);
//# sourceMappingURL=ProjectsController.js.map