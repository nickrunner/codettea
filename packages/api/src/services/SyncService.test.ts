import { SyncService } from './SyncService';
import { DatabaseConnection } from '../database/connection';
import { Migrator } from '../database/migrator';
import { FeatureRepository, IssueRepository, WorktreeRepository } from '../database/repositories';
import path from 'path';
import fs from 'fs-extra';

// Mock the @codettea/core utilities
jest.mock('@codettea/core', () => ({
  getExistingFeatures: jest.fn().mockResolvedValue([
    {
      name: 'test-feature-1',
      branch: 'feature/test-1',
      worktreePath: '/path/to/worktree1',
      description: 'Test feature 1'
    },
    {
      name: 'test-feature-2',
      branch: 'feature/test-2',
      worktreePath: '/path/to/worktree2',
      description: 'Test feature 2'
    }
  ]),
  getFeatureIssues: jest.fn().mockResolvedValue([
    {
      number: 1,
      title: 'Test issue 1',
      state: 'open',
      labels: ['bug'],
      stepNumber: 1
    },
    {
      number: 2,
      title: 'Test issue 2',
      state: 'closed',
      labels: ['feature'],
      stepNumber: 2
    }
  ]),
  getWorktreeStatus: jest.fn().mockResolvedValue({
    hasChanges: true,
    filesChanged: 5
  })
}));

describe('SyncService', () => {
  let syncService: SyncService;
  let featureRepo: FeatureRepository;
  let issueRepo: IssueRepository;
  let worktreeRepo: WorktreeRepository;
  const testDbPath = path.join(process.cwd(), '.test-data', 'sync-test.db');

  beforeAll(async () => {
    // Set test database path
    process.env.DATA_DIR = path.join(process.cwd(), '.test-data');
    process.env.MAIN_REPO_PATH = '/test/repo';
    
    // Ensure clean state
    await fs.remove(path.dirname(testDbPath));
    await fs.ensureDir(path.dirname(testDbPath));
    
    // Initialize database and run migrations
    DatabaseConnection.getInstance();
    const migrator = new Migrator();
    await migrator.up();
    
    syncService = new SyncService();
    featureRepo = new FeatureRepository();
    issueRepo = new IssueRepository();
    worktreeRepo = new WorktreeRepository();
  });

  afterAll(async () => {
    DatabaseConnection.getInstance().close();
    await fs.remove(path.dirname(testDbPath));
  });

  beforeEach(() => {
    // Clear all tables before each test
    const db = DatabaseConnection.getInstance().getDatabase();
    db.prepare('DELETE FROM sync_log').run();
    db.prepare('DELETE FROM agent_feedback').run();
    db.prepare('DELETE FROM issues').run();
    db.prepare('DELETE FROM worktrees').run();
    db.prepare('DELETE FROM features').run();
  });

  describe('syncAllFeatures', () => {
    it('should sync features from Git to database', async () => {
      await syncService.syncAllFeatures();

      const features = featureRepo.findAll();
      expect(features).toHaveLength(2);
      
      const feature1 = featureRepo.findByName('test-feature-1');
      expect(feature1).toBeDefined();
      expect(feature1?.branch).toBe('feature/test-1');
      expect(feature1?.worktree_path).toBe('/path/to/worktree1');
    });

    it('should sync issues for each feature', async () => {
      await syncService.syncAllFeatures();

      const feature = featureRepo.findByName('test-feature-1');
      expect(feature).toBeDefined();
      
      if (feature?.id) {
        const issues = issueRepo.findByFeatureId(feature.id);
        expect(issues).toHaveLength(2);
        
        const issue1 = issues.find(i => i.number === 1);
        expect(issue1?.title).toBe('Test issue 1');
        expect(issue1?.status).toBe('open');
      }
    });

    it('should sync worktree status', async () => {
      await syncService.syncAllFeatures();

      const feature = featureRepo.findByName('test-feature-1');
      expect(feature).toBeDefined();
      
      if (feature?.id) {
        const worktree = worktreeRepo.findByFeatureId(feature.id);
        expect(worktree).toBeDefined();
        expect(worktree?.has_changes).toBe(true);
        expect(worktree?.files_changed).toBe(5);
      }
    });

    it('should mark missing features as archived', async () => {
      // Create a feature that won't be in the Git response
      const oldFeature = featureRepo.create({
        name: 'old-feature',
        status: 'in_progress',
        branch: 'feature/old'
      });

      await syncService.syncAllFeatures();

      const updated = featureRepo.findById(oldFeature.id!);
      expect(updated?.status).toBe('archived');
    });
  });

  describe('invalidateCache', () => {
    beforeEach(async () => {
      // Setup initial data
      await syncService.syncAllFeatures();
    });

    it('should invalidate cache for specific feature', async () => {
      const feature = featureRepo.findByName('test-feature-1');
      expect(feature).toBeDefined();
      
      if (feature?.id) {
        // Modify the feature
        featureRepo.update(feature.id, { description: 'Modified' });
        
        // Invalidate cache
        await syncService.invalidateCache('feature', feature.id);
        
        // Check if sync was attempted (mocked function should be called)
        const { getExistingFeatures } = require('@codettea/core');
        expect(getExistingFeatures).toHaveBeenCalled();
      }
    });

    it('should invalidate all caches when no entityId provided', async () => {
      await syncService.invalidateCache('feature');
      
      const { getExistingFeatures } = require('@codettea/core');
      expect(getExistingFeatures).toHaveBeenCalled();
    });
  });

  describe('cleanupOldData', () => {
    it('should clean up old sync log entries', async () => {
      const db = DatabaseConnection.getInstance().getDatabase();
      
      // Create old log entry (31 days ago)
      db.prepare(`
        INSERT INTO sync_log (entity_type, action, source, status, created_at)
        VALUES ('feature', 'sync', 'git', 'success', datetime('now', '-31 days'))
      `).run();
      
      // Create recent log entry
      db.prepare(`
        INSERT INTO sync_log (entity_type, action, source, status, created_at)
        VALUES ('feature', 'sync', 'git', 'success', datetime('now'))
      `).run();
      
      await syncService.cleanupOldData(30);
      
      const logs = db.prepare('SELECT * FROM sync_log').all();
      expect(logs).toHaveLength(1);
    });
  });
});