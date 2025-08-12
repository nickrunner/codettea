import { FeatureRepository } from './FeatureRepository';
import { DatabaseConnection } from '../connection';
import { Migrator } from '../migrator';
import path from 'path';
import fs from 'fs-extra';

describe('FeatureRepository', () => {
  let repository: FeatureRepository;
  const testDbPath = path.join(process.cwd(), '.test-data', 'test.db');

  beforeAll(async () => {
    // Set test database path
    process.env.DATA_DIR = path.join(process.cwd(), '.test-data');
    
    // Ensure clean state
    await fs.remove(path.dirname(testDbPath));
    await fs.ensureDir(path.dirname(testDbPath));
    
    // Initialize database and run migrations
    DatabaseConnection.getInstance();
    const migrator = new Migrator();
    await migrator.up();
    
    repository = new FeatureRepository();
  });

  afterAll(async () => {
    // Close database and cleanup
    DatabaseConnection.getInstance().close();
    await fs.remove(path.dirname(testDbPath));
  });

  beforeEach(() => {
    // Clear features table before each test
    const db = DatabaseConnection.getInstance().getDatabase();
    db.prepare('DELETE FROM features').run();
  });

  describe('create', () => {
    it('should create a new feature', () => {
      const feature = repository.create({
        name: 'test-feature',
        description: 'Test feature description',
        status: 'planning',
        branch: 'feature/test-feature'
      });

      expect(feature.id).toBeDefined();
      expect(feature.name).toBe('test-feature');
      expect(feature.status).toBe('planning');
    });

    it('should throw error for duplicate feature name', () => {
      repository.create({
        name: 'duplicate-feature',
        description: 'First feature',
        status: 'planning',
        branch: 'feature/duplicate-1'
      });

      expect(() => {
        repository.create({
          name: 'duplicate-feature',
          description: 'Second feature',
          status: 'planning',
          branch: 'feature/duplicate-2'
        });
      }).toThrow();
    });
  });

  describe('findByName', () => {
    it('should find feature by name', () => {
      const created = repository.create({
        name: 'findable-feature',
        description: 'Can be found',
        status: 'in_progress',
        branch: 'feature/findable'
      });

      const found = repository.findByName('findable-feature');
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('findable-feature');
    });

    it('should return undefined for non-existent feature', () => {
      const found = repository.findByName('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('findByStatus', () => {
    it('should find features by status', () => {
      repository.create({
        name: 'planning-1',
        status: 'planning',
        branch: 'feature/planning-1'
      });

      repository.create({
        name: 'planning-2',
        status: 'planning',
        branch: 'feature/planning-2'
      });

      repository.create({
        name: 'in-progress-1',
        status: 'in_progress',
        branch: 'feature/in-progress-1'
      });

      const planningFeatures = repository.findByStatus('planning');
      const inProgressFeatures = repository.findByStatus('in_progress');

      expect(planningFeatures).toHaveLength(2);
      expect(inProgressFeatures).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update feature fields', () => {
      const feature = repository.create({
        name: 'updatable-feature',
        description: 'Original description',
        status: 'planning',
        branch: 'feature/updatable'
      });

      const updated = repository.update(feature.id!, {
        description: 'Updated description',
        status: 'in_progress'
      });

      expect(updated).toBe(true);

      const found = repository.findById(feature.id!);
      expect(found?.description).toBe('Updated description');
      expect(found?.status).toBe('in_progress');
    });

    it('should return false for non-existent feature', () => {
      const updated = repository.update(99999, {
        description: 'Should not update'
      });

      expect(updated).toBe(false);
    });
  });

  describe('findActiveFeatures', () => {
    it('should find only active features', () => {
      repository.create({
        name: 'active-1',
        status: 'planning',
        branch: 'feature/active-1'
      });

      repository.create({
        name: 'active-2',
        status: 'in_progress',
        branch: 'feature/active-2'
      });

      repository.create({
        name: 'completed-1',
        status: 'completed',
        branch: 'feature/completed-1'
      });

      repository.create({
        name: 'archived-1',
        status: 'archived',
        branch: 'feature/archived-1'
      });

      const activeFeatures = repository.findActiveFeatures();

      expect(activeFeatures).toHaveLength(2);
      expect(activeFeatures.every(f => 
        f.status === 'planning' || f.status === 'in_progress'
      )).toBe(true);
    });
  });

  describe('deleteById', () => {
    it('should delete feature by id', () => {
      const feature = repository.create({
        name: 'deletable-feature',
        status: 'planning',
        branch: 'feature/deletable'
      });

      const deleted = repository.deleteById(feature.id!);
      expect(deleted).toBe(true);

      const found = repository.findById(feature.id!);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent feature', () => {
      const deleted = repository.deleteById(99999);
      expect(deleted).toBe(false);
    });
  });
});