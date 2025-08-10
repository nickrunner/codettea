import { Feature, Issue, CreateFeatureRequest } from '../controllers/FeaturesController';
export declare class FeaturesService {
    private featuresPath;
    getAllFeatures(): Promise<Feature[]>;
    getFeature(name: string): Promise<Feature | null>;
    getFeatureIssues(name: string, status?: 'open' | 'closed' | 'all'): Promise<Issue[]>;
    createFeature(request: CreateFeatureRequest): Promise<Feature>;
    private loadFeatureMetadata;
}
//# sourceMappingURL=FeaturesService.d.ts.map