import { useCallback } from 'react';
import { useProjectsQuery, useScanProjectsMutation } from './queries/useProjectsQuery';
import { useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types/api';

export const useProjects = () => {
  const { data: projects, isLoading: loading, error, refetch } = useProjectsQuery();
  const scanMutation = useScanProjectsMutation();
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const scanProjects = useCallback(async () => {
    return scanMutation.mutateAsync();
  }, [scanMutation]);

  const setActiveProject = useCallback(async (name: string) => {
    // For now, just update the local cache
    // In a real app, this would make an API call
    queryClient.setQueryData<Project[]>(['projects'], (old) => 
      old?.map((p) => ({
        ...p,
        isActive: p.name === name,
      })) || []
    );
    return { name, isActive: true };
  }, [queryClient]);

  return {
    projects: projects || [],
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch projects') : null,
    refresh,
    scanProjects,
    setActiveProject,
  };
};