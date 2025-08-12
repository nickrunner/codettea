import { DatabaseConnection } from './connection';
import { Migrator } from './migrator';
import { logger } from '../utils/logger';
import { SyncService } from '../services/SyncService';

export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database...');
    
    DatabaseConnection.getInstance();
    
    const migrator = new Migrator();
    await migrator.up();
    
    const syncService = new SyncService();
    await syncService.syncAllFeatures();
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function shutdownDatabase(): Promise<void> {
  try {
    logger.info('Shutting down database...');
    DatabaseConnection.getInstance().close();
    logger.info('Database shutdown complete');
  } catch (error) {
    logger.error('Error during database shutdown:', error);
  }
}