import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { ClaudeStatus } from '@/types/api';

const CLAUDE_QUERY_KEY = ['claude', 'status'];

export const useClaudeStatusQuery = () => {
  return useQuery<ClaudeStatus>({
    queryKey: CLAUDE_QUERY_KEY,
    queryFn: apiClient.getClaudeStatus,
    refetchInterval: 30000, // Poll every 30 seconds
    retry: 3,
  });
};

export const useTestClaudeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.testClaudeConnection,
    onSuccess: (data) => {
      // Update the cache with the new status
      queryClient.setQueryData(CLAUDE_QUERY_KEY, data);
    },
  });
};