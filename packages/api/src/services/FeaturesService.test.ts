import { FeaturesService } from './FeaturesService';
import fs from 'fs-extra';

jest.mock('fs-extra');

describe('FeaturesService', () => {
  let service: FeaturesService;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    service = new FeaturesService();
    mockFs = fs as jest.Mocked<typeof fs>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllFeatures', () => {
    it('should return empty array when features directory does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false as any);

      const result = await service.getAllFeatures();

      expect(result).toEqual([]);
    });

    it('should return features from directory', async () => {
      mockFs.pathExists.mockResolvedValue(true as any);
      mockFs.readdir.mockResolvedValue(['feature1', 'feature2'] as any);
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.readJson.mockResolvedValue({
        name: 'feature1',
        description: 'Test feature',
        status: 'in_progress',
        branch: 'feature/feature1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      const result = await service.getAllFeatures();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('feature1');
    });
  });

  describe('getFeature', () => {
    it('should return feature metadata', async () => {
      const mockFeature = {
        name: 'feature1',
        description: 'Test feature',
        status: 'in_progress',
        branch: 'feature/feature1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockFs.pathExists.mockResolvedValue(true as any);
      mockFs.readJson.mockResolvedValue(mockFeature);

      const result = await service.getFeature('feature1');

      expect(result).toEqual(mockFeature);
    });

    it('should return null when feature does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false as any);

      const result = await service.getFeature('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createFeature', () => {
    it('should create a new feature', async () => {
      const request = {
        name: 'new-feature',
        description: 'New test feature',
        architectureMode: true
      };

      mockFs.ensureDir.mockResolvedValue(undefined as any);
      mockFs.writeJson.mockResolvedValue(undefined as any);

      const result = await service.createFeature(request);

      expect(result.name).toBe('new-feature');
      expect(result.description).toBe('New test feature');
      expect(result.status).toBe('planning');
      expect(result.branch).toBe('feature/new-feature');
      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeJson).toHaveBeenCalled();
    });
  });
});