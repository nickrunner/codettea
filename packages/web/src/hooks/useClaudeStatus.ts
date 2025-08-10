import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { ClaudeStatus } from '@/types/api';

export const useClaudeStatus = () => {
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getClaudeStatus();
      setStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Claude status';
      setError(errorMessage);
      console.error('Error fetching Claude status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.testClaudeConnection();
      await refresh(); // Refresh status after testing
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test Claude connection';
      setError(errorMessage);
      console.error('Error testing Claude connection:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return {
    status,
    loading,
    error,
    refresh,
    testConnection,
  };
};