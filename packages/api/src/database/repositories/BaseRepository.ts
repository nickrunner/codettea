import { getDb } from '../connection';
import Database from 'better-sqlite3';

export abstract class BaseRepository<T> {
  protected db: Database.Database;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = getDb();
    this.tableName = tableName;
  }

  protected prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  protected transaction<R>(fn: () => R): R {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  public findAll(limit?: number, offset?: number): T[] {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: unknown[] = [];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }
    
    return this.prepare(query).all(...params) as T[];
  }

  public findById(id: number): T | undefined {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return this.prepare(query).get(id) as T | undefined;
  }

  public count(): number {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const result = this.prepare(query).get() as { count: number };
    return result.count;
  }

  public deleteById(id: number): boolean {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = this.prepare(query).run(id);
    return result.changes > 0;
  }

  protected updateTimestamp(id: number): void {
    const query = `UPDATE ${this.tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.prepare(query).run(id);
  }
}