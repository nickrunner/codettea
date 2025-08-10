import { Project } from '../controllers/ProjectsController';
export declare class ProjectsService {
    private mainRepoPath;
    getAllProjects(): Promise<Project[]>;
    private isGitRepo;
    private getCurrentBranch;
    private getRemoteUrl;
}
//# sourceMappingURL=ProjectsService.d.ts.map