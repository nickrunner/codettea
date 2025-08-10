import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Project } from '@/types/api';

const PROJECTS_QUERY_KEY = ['projects'];

export const useProjectsQuery = () => {
  return useQuery<Project[]>({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: apiClient.getProjects,
    staleTime: 10 * 60 * 1000, // Consider data stale after 10 minutes
  });
};

export const useScanProjectsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.scanProjects,
    onSuccess: (projects) => {
      // Update the projects cache
      queryClient.setQueryData(PROJECTS_QUERY_KEY, projects);
    },
  });
};