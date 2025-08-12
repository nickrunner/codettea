import { BaseRepository } from './BaseRepository';
import { IssueModel, AgentFeedbackModel } from '../models';

export class IssueRepository extends BaseRepository<IssueModel> {
  constructor() {
    super('issues');
  }

  public create(issue: Omit<IssueModel, 'id' | 'created_at' | 'updated_at'>): IssueModel {
    const query = `
      INSERT INTO issues (
        number, feature_id, title, description, status, assignee, 
        labels, github_id, pr_number, attempt_count, solver_agent_id, 
        dependencies, step_number
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      issue.number,
      issue.feature_id || null,
      issue.title,
      issue.description || null,
      issue.status,
      issue.assignee || null,
      issue.labels || null,
      issue.github_id || null,
      issue.pr_number || null,
      issue.attempt_count || 0,
      issue.solver_agent_id || null,
      issue.dependencies || null,
      issue.step_number || null
    );
    
    return { ...issue, id: result.lastInsertRowid as number };
  }

  public update(id: number, issue: Partial<IssueModel>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(issue).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE issues SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(...values);
    
    return result.changes > 0;
  }

  public findByNumber(number: number): IssueModel | undefined {
    const query = `SELECT * FROM issues WHERE number = ?`;
    return this.prepare(query).get(number) as IssueModel | undefined;
  }

  public findByFeatureId(featureId: number): IssueModel[] {
    const query = `SELECT * FROM issues WHERE feature_id = ? ORDER BY step_number, number`;
    return this.prepare(query).all(featureId) as IssueModel[];
  }

  public findByStatus(status: string): IssueModel[] {
    const query = `SELECT * FROM issues WHERE status = ?`;
    return this.prepare(query).all(status) as IssueModel[];
  }

  public findOpenIssuesByFeature(featureId: number): IssueModel[] {
    const query = `SELECT * FROM issues WHERE feature_id = ? AND status = 'open' ORDER BY step_number, number`;
    return this.prepare(query).all(featureId) as IssueModel[];
  }

  public createBatch(issues: Omit<IssueModel, 'id' | 'created_at' | 'updated_at'>[]): IssueModel[] {
    return this.transaction(() => {
      const created: IssueModel[] = [];
      for (const issue of issues) {
        created.push(this.create(issue));
      }
      return created;
    });
  }

  public getIssueFeedback(issueId: number): AgentFeedbackModel[] {
    const query = `SELECT * FROM agent_feedback WHERE issue_id = ? ORDER BY created_at DESC`;
    return this.prepare(query).all(issueId) as AgentFeedbackModel[];
  }

  public addFeedback(feedback: Omit<AgentFeedbackModel, 'id' | 'created_at'>): AgentFeedbackModel {
    const query = `
      INSERT INTO agent_feedback (issue_id, agent_id, reviewer_profile, attempt_number, feedback, approval_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      feedback.issue_id || null,
      feedback.agent_id,
      feedback.reviewer_profile || null,
      feedback.attempt_number || null,
      feedback.feedback || null,
      feedback.approval_status || null
    );
    
    return { ...feedback, id: result.lastInsertRowid as number };
  }
}