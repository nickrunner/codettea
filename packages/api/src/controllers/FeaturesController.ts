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

export interface WorkFeatureRequest {
  issueNumber: number;
}

export interface AddIssuesRequest {
  issueNumbers: number[];
}

export interface WorktreeStatus {
  exists: boolean;
  path?: string;
  branch?: string;
  hasChanges?: boolean;
  filesChanged?: number;
}

export interface FeatureDetails extends Feature {
  issues: Issue[];
  worktreeStatus: WorktreeStatus;
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

  /**
   * Get features with active worktrees
   * @summary List features that have active worktrees
   */
  @Get('active')
  @Response<Feature[]>(200, 'List of active features')
  public async getActiveFeatures(): Promise<Feature[]> {
    const allFeatures = await this.featuresService.getAllFeatures();
    return allFeatures.filter(f => f.worktreePath !== undefined);
  }

  /**
   * Work on the next issue in a feature
   * @summary Start work on the next available issue in sequence
   */
  @Post('{name}/work-next')
  @Response(200, 'Work started on next issue')
  @Response(404, 'Feature not found')
  @Response(400, 'No open issues available')
  public async workOnNextIssue(@Path() name: string): Promise<{
    success: boolean;
    message: string;
    issueNumber?: number;
  }> {
    const result = await this.featuresService.workOnNextIssue(name);
    if (!result.success) {
      this.setStatus(result.message.includes('not found') ? 404 : 400);
    }
    return result;
  }

  /**
   * Work on a specific issue in a feature
   * @summary Start work on a specific issue number
   */
  @Post('{name}/work-issue')
  @Response(200, 'Work started on issue')
  @Response(404, 'Feature or issue not found')
  @Response(400, 'Invalid request')
  public async workOnSpecificIssue(
    @Path() name: string,
    @Body() request: WorkFeatureRequest
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const result = await this.featuresService.workOnSpecificIssue(name, request);
    if (!result.success) {
      this.setStatus(result.message.includes('not found') ? 404 : 400);
    }
    return result;
  }

  /**
   * Add issues to a feature
   * @summary Add multiple issues to an existing feature
   */
  @Post('{name}/add-issues')
  @Response(200, 'Issues added to feature')
  @Response(404, 'Feature not found')
  @Response(400, 'Invalid request')
  public async addIssuesToFeature(
    @Path() name: string,
    @Body() request: AddIssuesRequest
  ): Promise<{
    success: boolean;
    message: string;
    addedIssues?: number[];
  }> {
    const result = await this.featuresService.addIssuesToFeature(name, request);
    if (!result.success) {
      this.setStatus(result.message.includes('not found') ? 404 : 400);
    }
    return result;
  }

  /**
   * Get comprehensive feature details
   * @summary Get detailed information about a feature including issues and worktree status
   */
  @Get('{name}/details')
  @Response<FeatureDetails>(200, 'Feature details')
  @Response(404, 'Feature not found')
  public async getFeatureDetails(@Path() name: string): Promise<FeatureDetails> {
    const feature = await this.featuresService.getFeature(name);
    if (!feature) {
      this.setStatus(404);
      throw new Error(`Feature ${name} not found`);
    }

    const issues = await this.featuresService.getFeatureIssues(name);
    const worktreeStatus = await this.featuresService.getWorktreeStatus(name);

    return {
      ...feature,
      issues,
      worktreeStatus,
    };
  }

  /**
   * Get worktree status for a feature
   * @summary Check if a feature has an active worktree and its status
   */
  @Get('{name}/worktree-status')
  @Response<WorktreeStatus>(200, 'Worktree status')
  @Response(404, 'Feature not found')
  public async getWorktreeStatus(@Path() name: string): Promise<WorktreeStatus> {
    return await this.featuresService.getWorktreeStatus(name);
  }
}