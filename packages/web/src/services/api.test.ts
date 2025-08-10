// Mock axios before any imports
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  })),
}));

import { apiClient } from './api';

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Methods', () => {
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

      mockGet.mockResolvedValue(mockResponse);

      const result = await apiClient.getHealth();

      expect(mockGet).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });

    it('getClaudeStatus calls correct endpoint', async () => {
      const mockResponse = {
        data: {
          connected: true,
          lastCheck: '2024-01-01T10:00:00Z',
          capabilities: {
            model: 'claude-3',
            maxTokens: 100000,
          },
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await apiClient.getClaudeStatus();

      expect(mockGet).toHaveBeenCalledWith('/claude/status');
      expect(result).toEqual(mockResponse.data);
    });

    it('createFeature sends correct data', async () => {
      const createRequest = {
        name: 'test-feature',
        description: 'Test feature description',
      };

      const mockResponse = {
        data: {
          name: 'test-feature',
          description: 'Test feature description',
          status: 'planning',
          branch: 'feature/test-feature',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await apiClient.createFeature(createRequest);

      expect(mockPost).toHaveBeenCalledWith('/features', createRequest);
      expect(result).toEqual(mockResponse.data);
    });

    it('updateFeature sends correct data', async () => {
      const updateRequest = {
        status: 'in_progress' as const,
      };

      const mockResponse = {
        data: {
          name: 'test-feature',
          description: 'Test feature description',
          status: 'in_progress',
          branch: 'feature/test-feature',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T11:00:00Z',
        },
      };

      mockPatch.mockResolvedValue(mockResponse);

      const result = await apiClient.updateFeature('test-feature', updateRequest);

      expect(mockPatch).toHaveBeenCalledWith('/features/test-feature', updateRequest);
      expect(result).toEqual(mockResponse.data);
    });

    it('deleteFeature calls correct endpoint', async () => {
      mockDelete.mockResolvedValue({ data: {} });

      await apiClient.deleteFeature('test-feature');

      expect(mockDelete).toHaveBeenCalledWith('/features/test-feature');
    });

    it('getProjects calls correct endpoint', async () => {
      const mockResponse = {
        data: [
          {
            name: 'project-1',
            path: '/path/to/project-1',
            isGitRepo: true,
            currentBranch: 'main',
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await apiClient.getProjects();

      expect(mockGet).toHaveBeenCalledWith('/projects');
      expect(result).toEqual(mockResponse.data);
    });
  });
});