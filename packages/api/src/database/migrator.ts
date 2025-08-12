import { getDb } from './connection';
import { logger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';

export interface Migration {
  id: number;
  name: string;
  up: string;
  down: string;
}

export class Migrator {
  private db = getDb();
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.initMigrationsTable();
  }

  private initMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    const files = await fs.readdir(this.migrationsPath);
    
    for (const file of files.sort()) {
      if (file.endsWith('.sql')) {
        const content = await fs.readFile(path.join(this.migrationsPath, file), 'utf-8');
        const [up, down] = content.split('-- DOWN');
        const id = parseInt(file.split('_')[0]);
        
        migrations.push({
          id,
          name: file,
          up: up.replace('-- UP', '').trim(),
          down: down ? down.trim() : ''
        });
      }
    }
    
    return migrations;
  }

  public async up(): Promise<void> {
    const migrations = await this.loadMigrations();
    const applied = this.db.prepare('SELECT id FROM migrations').all() as { id: number }[];
    const appliedIds = new Set(applied.map(m => m.id));
    
    for (const migration of migrations) {
      if (!appliedIds.has(migration.id)) {
        logger.info(`Applying migration: ${migration.name}`);
        
        const transaction = this.db.transaction(() => {
          this.db.exec(migration.up);
          this.db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)')
            .run(migration.id, migration.name);
        });
        
        transaction();
        logger.info(`Migration ${migration.name} applied successfully`);
      }
    }
  }

  public async down(steps: number = 1): Promise<void> {
    const migrations = await this.loadMigrations();
    const applied = this.db.prepare('SELECT id, name FROM migrations ORDER BY id DESC LIMIT ?')
      .all(steps) as { id: number; name: string }[];
    
    for (const appliedMigration of applied) {
      const migration = migrations.find(m => m.id === appliedMigration.id);
      
      if (migration && migration.down) {
        logger.info(`Rolling back migration: ${migration.name}`);
        
        const transaction = this.db.transaction(() => {
          this.db.exec(migration.down);
          this.db.prepare('DELETE FROM migrations WHERE id = ?').run(migration.id);
        });
        
        transaction();
        logger.info(`Migration ${migration.name} rolled back successfully`);
      }
    }
  }

  public async reset(): Promise<void> {
    const applied = this.db.prepare('SELECT COUNT(*) as count FROM migrations').get() as { count: number };
    
    if (applied.count > 0) {
      await this.down(applied.count);
    }
    
    await this.up();
  }
}