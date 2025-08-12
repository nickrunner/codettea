import { BaseRepository } from './BaseRepository';
import { SyncLogModel } from '../models';

export class SyncLogRepository extends BaseRepository<SyncLogModel> {
  constructor() {
    super('sync_log');
  }

  public create(log: Omit<SyncLogModel, 'id' | 'created_at'>): SyncLogModel {
    const query = `
      INSERT INTO sync_log (entity_type, entity_id, action, source, status, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.prepare(query).run(
      log.entity_type,
      log.entity_id || null,
      log.action,
      log.source,
      log.status,
      log.error_message || null,
      log.metadata || null
    );
    
    return { ...log, id: result.lastInsertRowid as number };
  }

  public findByEntity(entityType: string, entityId: number): SyncLogModel[] {
    const query = `SELECT * FROM sync_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`;
    return this.prepare(query).all(entityType, entityId) as SyncLogModel[];
  }

  public findRecentLogs(limit: number = 100): SyncLogModel[] {
    const query = `SELECT * FROM sync_log ORDER BY created_at DESC LIMIT ?`;
    return this.prepare(query).all(limit) as SyncLogModel[];
  }

  public findFailedSyncs(): SyncLogModel[] {
    const query = `SELECT * FROM sync_log WHERE status = 'failure' ORDER BY created_at DESC`;
    return this.prepare(query).all() as SyncLogModel[];
  }

  public findPendingSyncs(): SyncLogModel[] {
    const query = `SELECT * FROM sync_log WHERE status = 'pending' ORDER BY created_at ASC`;
    return this.prepare(query).all() as SyncLogModel[];
  }

  public logSuccess(
    entityType: SyncLogModel['entity_type'],
    entityId: number,
    action: SyncLogModel['action'],
    source: SyncLogModel['source'],
    metadata?: string
  ): SyncLogModel {
    return this.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      source,
      status: 'success',
      metadata
    });
  }

  public logFailure(
    entityType: SyncLogModel['entity_type'],
    entityId: number,
    action: SyncLogModel['action'],
    source: SyncLogModel['source'],
    errorMessage: string,
    metadata?: string
  ): SyncLogModel {
    return this.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      source,
      status: 'failure',
      error_message: errorMessage,
      metadata
    });
  }

  public cleanOldLogs(daysToKeep: number = 30): number {
    const query = `DELETE FROM sync_log WHERE created_at < datetime('now', '-' || ? || ' days')`;
    const result = this.prepare(query).run(daysToKeep);
    return result.changes;
  }
}