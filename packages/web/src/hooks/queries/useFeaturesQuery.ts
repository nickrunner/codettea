import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Feature, Issue, CreateFeatureRequest, UpdateFeatureRequest } from '@/types/api';

const FEATURES_QUERY_KEY = ['features'];
const FEATURE_ISSUES_QUERY_KEY = (featureName: string) => ['features', featureName, 'issues'];

export const useFeaturesQuery = () => {
  return useQuery<Feature[]>({
    queryKey: FEATURES_QUERY_KEY,
    queryFn: apiClient.getFeatures,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });
};

export const useFeatureQuery = (name: string) => {
  return useQuery<Feature>({
    queryKey: [...FEATURES_QUERY_KEY, name],
    queryFn: () => apiClient.getFeature(name),
    enabled: !!name,
  });
};

export const useFeatureIssuesQuery = (featureName: string | null) => {
  return useQuery<Issue[]>({
    queryKey: FEATURE_ISSUES_QUERY_KEY(featureName || ''),
    queryFn: () => apiClient.getFeatureIssues(featureName!),
    enabled: !!featureName,
  });
};

export const useCreateFeatureMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeatureRequest) => apiClient.createFeature(data),
    onSuccess: (newFeature) => {
      // Add the new feature to the cache
      queryClient.setQueryData<Feature[]>(FEATURES_QUERY_KEY, (old) => 
        old ? [...old, newFeature] : [newFeature]
      );
    },
  });
};

export const useUpdateFeatureMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: UpdateFeatureRequest }) => 
      apiClient.updateFeature(name, data),
    onSuccess: (updatedFeature, { name }) => {
      // Update the feature in the cache
      queryClient.setQueryData<Feature[]>(FEATURES_QUERY_KEY, (old) => 
        old?.map(f => f.name === name ? updatedFeature : f) || []
      );
      // Also update the individual feature query
      queryClient.setQueryData([...FEATURES_QUERY_KEY, name], updatedFeature);
    },
  });
};

export const useDeleteFeatureMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => apiClient.deleteFeature(name),
    onSuccess: (_, name) => {
      // Remove the feature from the cache
      queryClient.setQueryData<Feature[]>(FEATURES_QUERY_KEY, (old) => 
        old?.filter(f => f.name !== name) || []
      );
      // Invalidate the individual feature query
      queryClient.invalidateQueries({ queryKey: [...FEATURES_QUERY_KEY, name] });
    },
  });
};