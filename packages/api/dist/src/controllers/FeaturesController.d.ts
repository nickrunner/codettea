import { Controller } from 'tsoa';
export interface Feature {
    name: string;
    description: string;
    status: 'planning' | 'in_progress' | 'completed' | 'archived';
    branch: string;
    worktreePath?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Issue {
    number: number;
    title: string;
    status: 'open' | 'closed' | 'in_progress';
    assignee?: string;
    labels: string[];
    createdAt: string;
    updatedAt: string;
}
export interface CreateFeatureRequest {
    name: string;
    description: string;
    architectureMode?: boolean;
}
export declare class FeaturesController extends Controller {
    private featuresService;
    constructor();
    /**
     * Get all features
     * @summary List all features in the system
     */
    getFeatures(): Promise<Feature[]>;
    /**
     * Get a specific feature by name
     * @summary Get feature details
     */
    getFeature(name: string): Promise<Feature>;
    /**
     * Get issues for a specific feature
     * @summary List all issues for a feature
     */
    getFeatureIssues(name: string, status?: 'open' | 'closed' | 'all'): Promise<Issue[]>;
    /**
     * Create a new feature
     * @summary Create a new feature with optional architecture planning
     */
    createFeature(request: CreateFeatureRequest): Promise<Feature>;
}
//# sourceMappingURL=FeaturesController.d.ts.map