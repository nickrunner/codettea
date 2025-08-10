import { Controller } from 'tsoa';
export interface Project {
    name: string;
    path: string;
    isGitRepo: boolean;
    currentBranch?: string;
    remoteUrl?: string;
}
export declare class ProjectsController extends Controller {
    private projectsService;
    constructor();
    /**
     * Get all available projects
     * @summary List all projects configured in the system
     */
    getProjects(): Promise<Project[]>;
}
//# sourceMappingURL=ProjectsController.d.ts.map