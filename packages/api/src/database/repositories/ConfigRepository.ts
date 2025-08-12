import { BaseRepository } from './BaseRepository';
import { ConfigModel } from '../models';

export class ConfigRepository extends BaseRepository<ConfigModel> {
  constructor() {
    super('config');
  }

  public create(config: Omit<ConfigModel, 'id' | 'created_at' | 'updated_at'>): ConfigModel {
    const query = `
      INSERT INTO config (key, value, description, category, is_secret)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      config.key,
      config.value || null,
      config.description || null,
      config.category || null,
      config.is_secret ? 1 : 0
    );
    
    return { ...config, id: result.lastInsertRowid as number };
  }

  public update(id: number, config: Partial<ConfigModel>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(config).forEach(([key, value]) => {
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
    const query = `UPDATE config SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = this.prepare(query).run(...values);
    
    return result.changes > 0;
  }

  public findByKey(key: string): ConfigModel | undefined {
    const query = `SELECT * FROM config WHERE key = ?`;
    return this.prepare(query).get(key) as ConfigModel | undefined;
  }

  public findByCategory(category: string): ConfigModel[] {
    const query = `SELECT * FROM config WHERE category = ?`;
    return this.prepare(query).all(category) as ConfigModel[];
  }

  public getValue(key: string): string | undefined {
    const config = this.findByKey(key);
    return config?.value;
  }

  public setValue(key: string, value: string): boolean {
    const existing = this.findByKey(key);
    
    if (existing && existing.id) {
      return this.update(existing.id, { value });
    } else {
      this.create({ key, value });
      return true;
    }
  }

  public getPublicConfigs(): ConfigModel[] {
    const query = `SELECT * FROM config WHERE is_secret = 0`;
    return this.prepare(query).all() as ConfigModel[];
  }

  public deleteByKey(key: string): boolean {
    const query = `DELETE FROM config WHERE key = ?`;
    const result = this.prepare(query).run(key);
    return result.changes > 0;
  }
}