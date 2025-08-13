import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, ProjectConfig } from '@/types/api';
import { apiClient } from '@/services/api';

interface ProjectContextValue {
  selectedProject: string | null;
  currentProject: Project | null;
  projectConfig: ProjectConfig | null;
  isLoading: boolean;
  error: string | null;
  selectProject: (projectName: string) => Promise<void>;
  refreshProjectConfig: () => Promise<void>;
  updateProjectConfig: (config: Partial<ProjectConfig>) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load selected project from localStorage on mount
  useEffect(() => {
    const loadInitialProject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check localStorage first
        const storedProject = localStorage.getItem('selectedProject');
        
        // Check server session
        const response = await apiClient.getSelectedProject();
        const serverProject = response.selectedProject;
        
        // Use server session if available, otherwise use localStorage
        const projectToSelect = serverProject || storedProject;
        
        if (projectToSelect) {
          await selectProjectInternal(projectToSelect, false);
        }
      } catch (err) {
        console.error('Error loading initial project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialProject();
  }, []);

  const selectProjectInternal = async (projectName: string, updateServer = true) => {
    setIsLoading(true);
    setError(null);

    try {
      // Update server session if requested
      if (updateServer) {
        const result = await apiClient.selectProject(projectName);
        if (!result.success) {
          throw new Error(result.message);
        }
      }

      // Update localStorage
      localStorage.setItem('selectedProject', projectName);
      
      // Get project details
      const projects = await apiClient.getProjects();
      const project = projects.find((p) => p.name === projectName);
      
      if (project) {
        setCurrentProject(project);
        setSelectedProject(projectName);
        
        // Load project config
        const config = await apiClient.getProjectConfig(projectName);
        setProjectConfig(config);
      }
    } catch (err) {
      console.error('Error selecting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to select project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const selectProject = async (projectName: string) => {
    await selectProjectInternal(projectName, true);
  };

  const refreshProjectConfig = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = await apiClient.getProjectConfig(selectedProject);
      setProjectConfig(config);
    } catch (err) {
      console.error('Error refreshing project config:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh config');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProjectConfig = async (config: Partial<ProjectConfig>) => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedConfig = await apiClient.updateProjectConfig(selectedProject, config);
      setProjectConfig(updatedConfig);
    } catch (err) {
      console.error('Error updating project config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value: ProjectContextValue = {
    selectedProject,
    currentProject,
    projectConfig,
    isLoading,
    error,
    selectProject,
    refreshProjectConfig,
    updateProjectConfig,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};