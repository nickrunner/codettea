import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { Project } from '@/types/api';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getProjects();
      setProjects(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const scanProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.scanProjects();
      setProjects(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan projects';
      setError(errorMessage);
      console.error('Error scanning projects:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveProject = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await apiClient.setActiveProject(name);
      setProjects(prev => prev.map(p => ({
        ...p,
        isActive: p.name === name,
      })));
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active project';
      setError(errorMessage);
      console.error('Error setting active project:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    projects,
    loading,
    error,
    refresh,
    scanProjects,
    setActiveProject,
  };
};