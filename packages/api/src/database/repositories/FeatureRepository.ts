import { BaseRepository } from './BaseRepository';
import { FeatureModel, FeatureWithRelations, IssueModel, WorktreeModel } from '../models';

export class FeatureRepository extends BaseRepository<FeatureModel> {
  constructor() {
    super('features');
  }

  public create(feature: Omit<FeatureModel, 'id' | 'created_at' | 'updated_at'>): FeatureModel {
    const query = `
      INSERT INTO features (name, description, status, branch, worktree_path, parent_feature_id, architecture_mode, github_project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      feature.name,
      feature.description || null,
      feature.status,
      feature.branch,
      feature.worktree_path || null,
      feature.parent_feature_id || null,
      feature.architecture_mode ? 1 : 0,
      feature.github_project_id || null
    );
    
    return { ...feature, id: result.lastInsertRowid as number };
  }

  public update(id: number, feature: Partial<FeatureModel>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(feature).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE features SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(...values);
    
    return result.changes > 0;
  }

  public findByName(name: string): FeatureModel | undefined {
    const query = `SELECT * FROM features WHERE name = ?`;
    return this.prepare(query).get(name) as FeatureModel | undefined;
  }

  public findByStatus(status: string): FeatureModel[] {
    const query = `SELECT * FROM features WHERE status = ?`;
    return this.prepare(query).all(status) as FeatureModel[];
  }

  public findWithRelations(id: number): FeatureWithRelations | undefined {
    const feature = this.findById(id);
    if (!feature) return undefined;
    
    const issuesQuery = `SELECT * FROM issues WHERE feature_id = ?`;
    const issues = this.prepare(issuesQuery).all(id) as IssueModel[];
    
    const worktreeQuery = `SELECT * FROM worktrees WHERE feature_id = ?`;
    const worktree = this.prepare(worktreeQuery).get(id) as WorktreeModel | undefined;
    
    const childrenQuery = `SELECT * FROM features WHERE parent_feature_id = ?`;
    const childFeatures = this.prepare(childrenQuery).all(id) as FeatureModel[];
    
    let parentFeature: FeatureModel | undefined;
    if (feature.parent_feature_id) {
      parentFeature = this.findById(feature.parent_feature_id);
    }
    
    return {
      ...feature,
      issues,
      worktree,
      parentFeature,
      childFeatures
    };
  }

  public findActiveFeatures(): FeatureModel[] {
    const query = `SELECT * FROM features WHERE status IN ('planning', 'in_progress') ORDER BY updated_at DESC`;
    return this.prepare(query).all() as FeatureModel[];
  }
}