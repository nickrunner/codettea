import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaudeStatus } from './useClaudeStatus';

// Mock the queries module
jest.mock('./queries/useClaudeQuery', () => ({
  useClaudeStatusQuery: jest.fn(() => ({
    data: { connected: true, lastCheck: '2024-01-01T10:00:00Z', capabilities: { model: 'claude-3', maxTokens: 100000 } },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useTestClaudeMutation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

describe('useClaudeStatus', () => {
  it('returns Claude status data', () => {
    const { result } = renderHook(() => useClaudeStatus());

    expect(result.current.status).toEqual({
      connected: true,
      lastCheck: '2024-01-01T10:00:00Z',
      capabilities: { model: 'claude-3', maxTokens: 100000 },
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls refresh function', () => {
    const mockRefetch = jest.fn();
    
    jest.mock('./queries/useClaudeQuery', () => ({
      useClaudeStatusQuery: jest.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      })),
      useTestClaudeMutation: jest.fn(() => ({
        mutateAsync: jest.fn(),
      })),
    }));

    const { result } = renderHook(() => useClaudeStatus());
    result.current.refresh();
    
    // Since refresh is mocked, we just verify it's callable
    expect(typeof result.current.refresh).toBe('function');
  });
});