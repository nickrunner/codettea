import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database;
  private readonly dbPath: string;

  private constructor() {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '.data');
    fs.ensureDirSync(dataDir);
    
    this.dbPath = path.join(dataDir, 'codettea.db');
    
    this.db = new Database(this.dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? 
        (message?: unknown) => logger.debug(`SQL: ${message}`) : undefined
    });
    
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    logger.info(`Database initialized at ${this.dbPath}`);
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  public transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  public prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }
}

export const getDb = (): Database.Database => {
  return DatabaseConnection.getInstance().getDatabase();
};