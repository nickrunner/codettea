import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectProvider, useProjectContext } from './ProjectContext';
import { apiClient } from '@/services/api';

// Mock the API client
jest.mock('@/services/api', () => ({
  apiClient: {
    getSelectedProject: jest.fn(),
    getProjects: jest.fn(),
    selectProject: jest.fn(),
    getProjectConfig: jest.fn(),
    updateProjectConfig: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that uses the context
const TestComponent: React.FC = () => {
  const {
    selectedProject,
    currentProject,
    projectConfig,
    isLoading,
    error,
    selectProject,
    refreshProjectConfig,
    updateProjectConfig
  } = useProjectContext();

  return (
    <div>
      <div data-testid="selected-project">{selectedProject || 'none'}</div>
      <div data-testid="current-project">{currentProject?.name || 'none'}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      {projectConfig && (
        <div data-testid="config">
          {projectConfig.maxConcurrentTasks} tasks, {projectConfig.requiredApprovals} approvals
        </div>
      )}
      <button onClick={() => selectProject('test-project')}>Select Project</button>
      <button onClick={refreshProjectConfig}>Refresh Config</button>
      <button onClick={() => updateProjectConfig({ maxConcurrentTasks: 5 })}>
        Update Config
      </button>
    </div>
  );
};

describe('ProjectContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Initial Load', () => {
    it('should load selected project from server session', async () => {
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: 'server-project'
      });
      (apiClient.getProjects as jest.Mock).mockResolvedValue([
        { name: 'server-project', path: '/server/path' }
      ]);
      (apiClient.getProjectConfig as jest.Mock).mockResolvedValue({
        mainRepoPath: '/server/path',
        baseWorktreePath: '/server/worktrees',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend', 'backend']
      });

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('selected-project')).toHaveTextContent('server-project');
      });

      expect(screen.getByTestId('current-project')).toHaveTextContent('server-project');
      expect(localStorageMock.getItem('selectedProject')).toBe('server-project');
    });

    it('should load selected project from localStorage if server has none', async () => {
      localStorageMock.setItem('selectedProject', 'local-project');
      
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: null
      });
      (apiClient.getProjects as jest.Mock).mockResolvedValue([
        { name: 'local-project', path: '/local/path' }
      ]);
      (apiClient.getProjectConfig as jest.Mock).mockResolvedValue({
        mainRepoPath: '/local/path',
        baseWorktreePath: '/local/worktrees',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend']
      });

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('selected-project')).toHaveTextContent('local-project');
      });
    });

    it('should handle no initial selection', async () => {
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: null
      });

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('selected-project')).toHaveTextContent('none');
      expect(screen.getByTestId('current-project')).toHaveTextContent('none');
    });
  });

  describe('Project Selection', () => {
    it('should select a project and update all states', async () => {
      const user = userEvent.setup();
      
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: null
      });
      (apiClient.selectProject as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Selected project test-project'
      });
      (apiClient.getProjects as jest.Mock).mockResolvedValue([
        { name: 'test-project', path: '/test/path' }
      ]);
      (apiClient.getProjectConfig as jest.Mock).mockResolvedValue({
        mainRepoPath: '/test/path',
        baseWorktreePath: '/test/worktrees',
        maxConcurrentTasks: 3,
        requiredApprovals: 2,
        reviewerProfiles: ['frontend', 'backend']
      });

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Select Project'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-project')).toHaveTextContent('test-project');
      });

      expect(apiClient.selectProject).toHaveBeenCalledWith('test-project');
      expect(localStorageMock.getItem('selectedProject')).toBe('test-project');
      expect(screen.getByTestId('config')).toHaveTextContent('3 tasks, 2 approvals');
    });

    it('should handle selection failure', async () => {
      const user = userEvent.setup();
      
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: null
      });
      (apiClient.selectProject as jest.Mock).mockRejectedValue(
        new Error('Project not found')
      );

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Select Project'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to select project');
      });
    });
  });

  describe('Configuration Management', () => {
    it('should refresh project configuration', async () => {
      const user = userEvent.setup();
      
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: 'test-project'
      });
      (apiClient.getProjects as jest.Mock).mockResolvedValue([
        { name: 'test-project', path: '/test/path' }
      ]);
      (apiClient.getProjectConfig as jest.Mock)
        .mockResolvedValueOnce({
          mainRepoPath: '/test/path',
          baseWorktreePath: '/test/worktrees',
          maxConcurrentTasks: 2,
          requiredApprovals: 3,
          reviewerProfiles: ['frontend']
        })
        .mockResolvedValueOnce({
          mainRepoPath: '/test/path',
          baseWorktreePath: '/test/worktrees',
          maxConcurrentTasks: 4,
          requiredApprovals: 2,
          reviewerProfiles: ['frontend', 'backend']
        });

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('config')).toHaveTextContent('2 tasks, 3 approvals');
      });

      await user.click(screen.getByText('Refresh Config'));

      await waitFor(() => {
        expect(screen.getByTestId('config')).toHaveTextContent('4 tasks, 2 approvals');
      });
    });

    it('should update project configuration', async () => {
      const user = userEvent.setup();
      
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: 'test-project'
      });
      (apiClient.getProjects as jest.Mock).mockResolvedValue([
        { name: 'test-project', path: '/test/path' }
      ]);
      (apiClient.getProjectConfig as jest.Mock).mockResolvedValue({
        mainRepoPath: '/test/path',
        baseWorktreePath: '/test/worktrees',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend']
      });
      (apiClient.updateProjectConfig as jest.Mock).mockResolvedValue({
        mainRepoPath: '/test/path',
        baseWorktreePath: '/test/worktrees',
        maxConcurrentTasks: 5,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend']
      });

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('config')).toHaveTextContent('2 tasks, 3 approvals');
      });

      await user.click(screen.getByText('Update Config'));

      await waitFor(() => {
        expect(screen.getByTestId('config')).toHaveTextContent('5 tasks, 3 approvals');
      });

      expect(apiClient.updateProjectConfig).toHaveBeenCalledWith(
        'test-project',
        { maxConcurrentTasks: 5 }
      );
    });

    it('should handle update failure', async () => {
      const user = userEvent.setup();
      
      (apiClient.getSelectedProject as jest.Mock).mockResolvedValue({
        selectedProject: 'test-project'
      });
      (apiClient.getProjects as jest.Mock).mockResolvedValue([
        { name: 'test-project', path: '/test/path' }
      ]);
      (apiClient.getProjectConfig as jest.Mock).mockResolvedValue({
        mainRepoPath: '/test/path',
        baseWorktreePath: '/test/worktrees',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend']
      });
      (apiClient.updateProjectConfig as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Update Config'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to update config');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (apiClient.getSelectedProject as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <ProjectProvider>
          <TestComponent />
        </ProjectProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to load project');
      });
    });
  });
});