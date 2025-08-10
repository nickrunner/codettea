import { useCallback } from 'react';
import { useClaudeStatusQuery, useTestClaudeMutation } from './queries/useClaudeQuery';

export const useClaudeStatus = () => {
  const { data: status, isLoading: loading, error, refetch } = useClaudeStatusQuery();
  const testMutation = useTestClaudeMutation();

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const testConnection = useCallback(async () => {
    return testMutation.mutateAsync();
  }, [testMutation]);

  return {
    status: status || null,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch Claude status') : null,
    refresh,
    testConnection,
  };
};