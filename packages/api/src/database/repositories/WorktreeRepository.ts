import { BaseRepository } from './BaseRepository';
import { WorktreeModel } from '../models';

export class WorktreeRepository extends BaseRepository<WorktreeModel> {
  constructor() {
    super('worktrees');
  }

  public create(worktree: Omit<WorktreeModel, 'id' | 'created_at' | 'updated_at'>): WorktreeModel {
    const query = `
      INSERT INTO worktrees (path, branch, feature_id, commit, is_main, exists, has_changes, files_changed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      worktree.path,
      worktree.branch,
      worktree.feature_id || null,
      worktree.commit || null,
      worktree.is_main ? 1 : 0,
      worktree.exists !== false ? 1 : 0,
      worktree.has_changes ? 1 : 0,
      worktree.files_changed || 0
    );
    
    return { ...worktree, id: result.lastInsertRowid as number };
  }

  public update(id: number, worktree: Partial<WorktreeModel>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(worktree).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`);
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE worktrees SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(...values);
    
    return result.changes > 0;
  }

  public findByPath(path: string): WorktreeModel | undefined {
    const query = `SELECT * FROM worktrees WHERE path = ?`;
    return this.prepare(query).get(path) as WorktreeModel | undefined;
  }

  public findByBranch(branch: string): WorktreeModel | undefined {
    const query = `SELECT * FROM worktrees WHERE branch = ?`;
    return this.prepare(query).get(branch) as WorktreeModel | undefined;
  }

  public findByFeatureId(featureId: number): WorktreeModel | undefined {
    const query = `SELECT * FROM worktrees WHERE feature_id = ?`;
    return this.prepare(query).get(featureId) as WorktreeModel | undefined;
  }

  public findActiveWorktrees(): WorktreeModel[] {
    const query = `SELECT * FROM worktrees WHERE exists = 1`;
    return this.prepare(query).all() as WorktreeModel[];
  }

  public findWorktreesWithChanges(): WorktreeModel[] {
    const query = `SELECT * FROM worktrees WHERE has_changes = 1`;
    return this.prepare(query).all() as WorktreeModel[];
  }

  public markAsDeleted(id: number): boolean {
    const query = `UPDATE worktrees SET exists = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(id);
    return result.changes > 0;
  }
}