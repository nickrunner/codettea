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

  describe('executeFeature', () => {
    it('should execute a feature successfully', async () => {
      const request = {
        architectureMode: false,
        issueNumbers: [1, 2, 3]
      };

      const mockResult = {
        success: true,
        message: 'Feature execution queued',
        executionId: 'exec-123'
      };

      mockFeaturesService.executeFeature.mockResolvedValue(mockResult);

      const result = await controller.executeFeature('test-feature', request);

      expect(result).toEqual(mockResult);
      expect(mockFeaturesService.executeFeature).toHaveBeenCalledWith('test-feature', request);
    });

    it('should set 404 status when feature not found', async () => {
      const request = {
        architectureMode: false
      };

      const mockResult = {
        success: false,
        message: 'Feature not found'
      };

      mockFeaturesService.executeFeature.mockResolvedValue(mockResult);
      const setStatusSpy = jest.spyOn(controller, 'setStatus');

      const result = await controller.executeFeature('nonexistent', request);

      expect(result).toEqual(mockResult);
      expect(setStatusSpy).toHaveBeenCalledWith(404);
    });

    it('should set 400 status when feature already executing', async () => {
      const request = {
        architectureMode: false
      };

      const mockResult = {
        success: false,
        message: 'Feature is already being executed'
      };

      mockFeaturesService.executeFeature.mockResolvedValue(mockResult);
      const setStatusSpy = jest.spyOn(controller, 'setStatus');

      const result = await controller.executeFeature('test-feature', request);

      expect(result).toEqual(mockResult);
      expect(setStatusSpy).toHaveBeenCalledWith(400);
    });
  });

  describe('getExecutionStatus', () => {
    it('should return execution status for a feature', async () => {
      const mockStatus = {
        featureName: 'test-feature',
        status: 'running' as const,
        startTime: '2024-01-01T00:00:00Z',
        currentStep: 'Running solver agent'
      };

      mockFeaturesService.getExecutionStatus.mockResolvedValue(mockStatus);

      const result = await controller.getExecutionStatus('test-feature');

      expect(result).toEqual(mockStatus);
      expect(mockFeaturesService.getExecutionStatus).toHaveBeenCalledWith('test-feature');
    });

    it('should return null when no execution status exists', async () => {
      mockFeaturesService.getExecutionStatus.mockResolvedValue(null);

      const result = await controller.getExecutionStatus('test-feature');

      expect(result).toBeNull();
    });
  });
});