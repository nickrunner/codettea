import { FeaturesController } from './FeaturesController';
import { FeaturesService } from '../services/FeaturesService';

jest.mock('../services/FeaturesService');

describe('FeaturesController', () => {
  let controller: FeaturesController;
  let mockFeaturesService: jest.Mocked<FeaturesService>;

  beforeEach(() => {
    controller = new FeaturesController();
    mockFeaturesService = (controller as any).featuresService;
  });

  describe('getFeatures', () => {
    it('should return all features', async () => {
      const mockFeatures = [
        {
          name: 'feature1',
          description: 'Test feature 1',
          status: 'in_progress' as const,
          branch: 'feature/feature1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockFeaturesService.getAllFeatures.mockResolvedValue(mockFeatures);

      const result = await controller.getFeatures();

      expect(result).toEqual(mockFeatures);
      expect(mockFeaturesService.getAllFeatures).toHaveBeenCalled();
    });
  });

  describe('getFeature', () => {
    it('should return a specific feature', async () => {
      const mockFeature = {
        name: 'feature1',
        description: 'Test feature 1',
        status: 'in_progress' as const,
        branch: 'feature/feature1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockFeaturesService.getFeature.mockResolvedValue(mockFeature);

      const result = await controller.getFeature('feature1');

      expect(result).toEqual(mockFeature);
      expect(mockFeaturesService.getFeature).toHaveBeenCalledWith('feature1');
    });

    it('should throw error when feature not found', async () => {
      mockFeaturesService.getFeature.mockResolvedValue(null);

      await expect(controller.getFeature('nonexistent')).rejects.toThrow('Feature nonexistent not found');
    });
  });

  describe('getFeatureIssues', () => {
    it('should return issues for a feature', async () => {
      const mockIssues = [
        {
          number: 1,
          title: 'Test issue',
          status: 'open' as const,
          labels: ['bug'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockFeaturesService.getFeatureIssues.mockResolvedValue(mockIssues);

      const result = await controller.getFeatureIssues('feature1', 'open');

      expect(result).toEqual(mockIssues);
      expect(mockFeaturesService.getFeatureIssues).toHaveBeenCalledWith('feature1', 'open');
    });
  });

  describe('createFeature', () => {
    it('should create a new feature', async () => {
      const request = {
        name: 'new-feature',
        description: 'New test feature',
        architectureMode: true
      };

      const mockFeature = {
        ...request,
        status: 'planning' as const,
        branch: 'feature/new-feature',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockFeaturesService.createFeature.mockResolvedValue(mockFeature);

      const result = await controller.createFeature(request);

      expect(result).toEqual(mockFeature);
      expect(mockFeaturesService.createFeature).toHaveBeenCalledWith(request);
    });
  });
});