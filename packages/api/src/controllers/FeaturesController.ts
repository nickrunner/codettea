import { Controller, Get, Post, Route, Tags, Response, Body, Path, Query } from 'tsoa';
import { FeaturesService } from '../services/FeaturesService';

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

@Route('features')
@Tags('Features')
export class FeaturesController extends Controller {
  private featuresService: FeaturesService;

  constructor() {
    super();
    this.featuresService = new FeaturesService();
  }

  /**
   * Get all features
   * @summary List all features in the system
   */
  @Get()
  @Response<Feature[]>(200, 'List of features')
  public async getFeatures(): Promise<Feature[]> {
    return this.featuresService.getAllFeatures();
  }

  /**
   * Get a specific feature by name
   * @summary Get feature details
   */
  @Get('{name}')
  @Response<Feature>(200, 'Feature details')
  @Response(404, 'Feature not found')
  public async getFeature(@Path() name: string): Promise<Feature> {
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
  @Get('{name}/issues')
  @Response<Issue[]>(200, 'List of issues')
  @Response(404, 'Feature not found')
  public async getFeatureIssues(
    @Path() name: string,
    @Query() status?: 'open' | 'closed' | 'all'
  ): Promise<Issue[]> {
    return this.featuresService.getFeatureIssues(name, status);
  }

  /**
   * Create a new feature
   * @summary Create a new feature with optional architecture planning
   */
  @Post()
  @Response<Feature>(201, 'Feature created')
  @Response(400, 'Invalid request')
  public async createFeature(@Body() request: CreateFeatureRequest): Promise<Feature> {
    const feature = await this.featuresService.createFeature(request);
    this.setStatus(201);
    return feature;
  }
}