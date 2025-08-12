import { BaseRepository } from './BaseRepository';
import { ProjectModel } from '../models';

export class ProjectRepository extends BaseRepository<ProjectModel> {
  constructor() {
    super('projects');
  }

  public create(project: Omit<ProjectModel, 'id' | 'created_at' | 'updated_at'>): ProjectModel {
    const query = `
      INSERT INTO projects (
        name, description, repo_path, base_worktree_path, github_repo, 
        base_branch, max_concurrent_tasks, required_approvals, 
        reviewer_profiles, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      project.name,
      project.description || null,
      project.repo_path,
      project.base_worktree_path,
      project.github_repo || null,
      project.base_branch || 'main',
      project.max_concurrent_tasks || 2,
      project.required_approvals || 3,
      project.reviewer_profiles || 'backend,frontend,devops',
      project.is_active !== false ? 1 : 0
    );
    
    return { ...project, id: result.lastInsertRowid as number };
  }

  public update(id: number, project: Partial<ProjectModel>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(project).forEach(([key, value]) => {
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
    const query = `UPDATE projects SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(...values);
    
    return result.changes > 0;
  }

  public findByName(name: string): ProjectModel | undefined {
    const query = `SELECT * FROM projects WHERE name = ?`;
    return this.prepare(query).get(name) as ProjectModel | undefined;
  }

  public findActiveProjects(): ProjectModel[] {
    const query = `SELECT * FROM projects WHERE is_active = 1`;
    return this.prepare(query).all() as ProjectModel[];
  }

  public findByRepoPath(repoPath: string): ProjectModel | undefined {
    const query = `SELECT * FROM projects WHERE repo_path = ?`;
    return this.prepare(query).get(repoPath) as ProjectModel | undefined;
  }

  public setActive(id: number, active: boolean): boolean {
    const query = `UPDATE projects SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(active ? 1 : 0, id);
    return result.changes > 0;
  }
}