import { renderHook, act } from '@testing-library/react';
import { useClaudeStatus } from './useClaudeStatus';
import { apiClient } from '@/services/api';

jest.mock('@/services/api');

describe('useClaudeStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with null status', () => {
    const { result } = renderHook(() => useClaudeStatus());

    expect(result.current.status).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches Claude status successfully', async () => {
    const mockStatus = {
      connected: true,
      lastCheck: '2024-01-01T10:00:00Z',
      capabilities: {
        model: 'claude-3',
        maxTokens: 100000,
      },
    };

    (apiClient.getClaudeStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useClaudeStatus());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles errors when fetching status', async () => {
    const errorMessage = 'Failed to connect';
    (apiClient.getClaudeStatus as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useClaudeStatus());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('sets loading state during fetch', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.getClaudeStatus as jest.Mock).mockReturnValue(promise);

    const { result } = renderHook(() => useClaudeStatus());

    act(() => {
      result.current.refresh();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise!({
        connected: true,
        lastCheck: '2024-01-01T10:00:00Z',
      });
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('tests Claude connection', async () => {
    const mockTestResult = { success: true, message: 'Connection successful' };
    const mockStatus = {
      connected: true,
      lastCheck: '2024-01-01T10:00:00Z',
    };

    (apiClient.testClaudeConnection as jest.Mock).mockResolvedValue(mockTestResult);
    (apiClient.getClaudeStatus as jest.Mock).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useClaudeStatus());

    let testResult;
    await act(async () => {
      testResult = await result.current.testConnection();
    });

    expect(testResult).toEqual(mockTestResult);
    expect(apiClient.testClaudeConnection).toHaveBeenCalled();
    expect(apiClient.getClaudeStatus).toHaveBeenCalled();
    expect(result.current.status).toEqual(mockStatus);
  });

  it('handles test connection errors', async () => {
    const errorMessage = 'Connection test failed';
    (apiClient.testClaudeConnection as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useClaudeStatus());

    await act(async () => {
      try {
        await result.current.testConnection();
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.loading).toBe(false);
  });
});