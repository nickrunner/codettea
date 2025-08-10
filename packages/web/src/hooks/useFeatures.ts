import { useCallback } from 'react';
import { 
  useFeaturesQuery, 
  useFeatureIssuesQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useDeleteFeatureMutation
} from './queries/useFeaturesQuery';
import { CreateFeatureRequest, UpdateFeatureRequest } from '@/types/api';

export const useFeatures = () => {
  const { data: features, isLoading: loading, error, refetch } = useFeaturesQuery();
  const createMutation = useCreateFeatureMutation();
  const updateMutation = useUpdateFeatureMutation();
  const deleteMutation = useDeleteFeatureMutation();

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const createFeature = useCallback(async (data: CreateFeatureRequest) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  const updateFeature = useCallback(async (name: string, data: UpdateFeatureRequest) => {
    return updateMutation.mutateAsync({ name, data });
  }, [updateMutation]);

  const deleteFeature = useCallback(async (name: string) => {
    return deleteMutation.mutateAsync(name);
  }, [deleteMutation]);

  return {
    features: features || [],
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch features') : null,
    refresh,
    createFeature,
    updateFeature,
    deleteFeature,
  };
};

export const useFeatureIssues = (featureName: string | null) => {
  const { data: issues, isLoading: loading, error, refetch } = useFeatureIssuesQuery(featureName);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    issues: issues || [],
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch issues') : null,
    refresh,
  };
};