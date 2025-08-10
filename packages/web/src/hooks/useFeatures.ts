import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/services/api';
import { Feature, Issue, CreateFeatureRequest, UpdateFeatureRequest } from '@/types/api';

export const useFeatures = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getFeatures();
      setFeatures(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch features';
      setError(errorMessage);
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFeature = useCallback(async (data: CreateFeatureRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const newFeature = await apiClient.createFeature(data);
      setFeatures(prev => [...prev, newFeature]);
      return newFeature;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create feature';
      setError(errorMessage);
      console.error('Error creating feature:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFeature = useCallback(async (name: string, data: UpdateFeatureRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedFeature = await apiClient.updateFeature(name, data);
      setFeatures(prev => prev.map(f => f.name === name ? updatedFeature : f));
      return updatedFeature;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feature';
      setError(errorMessage);
      console.error('Error updating feature:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFeature = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiClient.deleteFeature(name);
      setFeatures(prev => prev.filter(f => f.name !== name));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete feature';
      setError(errorMessage);
      console.error('Error deleting feature:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    features,
    loading,
    error,
    refresh,
    createFeature,
    updateFeature,
    deleteFeature,
  };
};

export const useFeatureIssues = (featureName: string | null) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!featureName) {
      setIssues([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getFeatureIssues(featureName);
      setIssues(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch issues';
      setError(errorMessage);
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  }, [featureName]);

  useEffect(() => {
    refresh();
  }, [featureName]);

  return {
    issues,
    loading,
    error,
    refresh,
  };
};