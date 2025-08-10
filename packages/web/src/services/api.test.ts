import axios from 'axios';
import { apiClient } from './api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('formats API errors correctly', async () => {
      const mockError = {
        response: {
          data: {
            message: 'API Error',
            code: 'ERR_001',
            details: { field: 'value' },
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(mockError),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn((_success, error) => error(mockError)) },
        },
      } as any);

      try {
        await apiClient.getHealth();
      } catch (error: any) {
        expect(error.message).toBe('API Error');
        expect(error.code).toBe('ERR_001');
        expect(error.details).toEqual({ field: 'value' });
      }
    });

    it('handles network errors', async () => {
      const mockError = {
        message: 'Network Error',
        code: 'ECONNABORTED',
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(mockError),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn((_success, error) => error(mockError)) },
        },
      } as any);

      try {
        await apiClient.getHealth();
      } catch (error: any) {
        expect(error.message).toBe('Network Error');
        expect(error.code).toBe('ECONNABORTED');
      }
    });
  });

  describe('API Methods', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockClient);
    });

    it('getHealth calls correct endpoint', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          timestamp: '2024-01-01T10:00:00Z',
          version: '1.0.0',
          services: {
            api: true,
            claude: true,
            filesystem: true,
          },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getHealth();

      expect(mockClient.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });

    it('getClaudeStatus calls correct endpoint', async () => {
      const mockResponse = {
        data: {
          connected: true,
          lastCheck: '2024-01-01T10:00:00Z',
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getClaudeStatus();

      expect(mockClient.get).toHaveBeenCalledWith('/claude/status');
      expect(result).toEqual(mockResponse.data);
    });

    it('createFeature sends correct data', async () => {
      const mockRequest = {
        name: 'new-feature',
        description: 'Test feature',
        architectureMode: true,
      };

      const mockResponse = {
        data: {
          ...mockRequest,
          status: 'planning',
          branch: 'feature/new-feature',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await apiClient.createFeature(mockRequest);

      expect(mockClient.post).toHaveBeenCalledWith('/features', mockRequest);
      expect(result).toEqual(mockResponse.data);
    });

    it('updateFeature sends patch request', async () => {
      const mockRequest = {
        status: 'completed' as const,
      };

      const mockResponse = {
        data: {
          name: 'feature-1',
          description: 'Test feature',
          status: 'completed',
          branch: 'feature/feature-1',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-02T10:00:00Z',
        },
      };

      mockClient.patch.mockResolvedValue(mockResponse);

      const result = await apiClient.updateFeature('feature-1', mockRequest);

      expect(mockClient.patch).toHaveBeenCalledWith('/features/feature-1', mockRequest);
      expect(result).toEqual(mockResponse.data);
    });

    it('deleteFeature calls delete endpoint', async () => {
      mockClient.delete.mockResolvedValue({});

      await apiClient.deleteFeature('feature-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/features/feature-1');
    });
  });
});