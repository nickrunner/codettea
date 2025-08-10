import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SystemConfig, Agent, Feature, Worktree } from '@/types';
import { apiClient } from '@/api/client';
import { wsClient } from '@/api/websocket';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  authToken: string | null;

  // System
  config: SystemConfig | null;
  isLoading: boolean;
  error: string | null;

  // Agents
  agents: Agent[];
  selectedAgent: Agent | null;

  // Features
  features: Feature[];
  selectedFeature: Feature | null;

  // Worktrees
  worktrees: Worktree[];
  selectedWorktree: Worktree | null;

  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Array<{
    id: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    timestamp: Date;
  }>;

  // Actions
  // Auth
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // System
  loadConfig: () => Promise<void>;
  updateConfig: (config: Partial<SystemConfig>) => Promise<void>;
  selectProject: (projectName: string) => Promise<void>;

  // Agents
  loadAgents: () => Promise<void>;
  selectAgent: (agent: Agent | null) => void;
  stopAgent: (agentId: string) => Promise<void>;

  // Features
  loadFeatures: () => Promise<void>;
  selectFeature: (feature: Feature | null) => void;
  createFeature: (name: string, description: string) => Promise<void>;
  deleteFeature: (featureId: string) => Promise<void>;
  assignIssue: (featureId: string, issueNumber: number) => Promise<void>;

  // Worktrees
  loadWorktrees: () => Promise<void>;
  selectWorktree: (worktree: Worktree | null) => void;
  createWorktree: (feature: string, branch: string) => Promise<void>;
  deleteWorktree: (path: string) => Promise<void>;

  // UI
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (message: string, level: 'info' | 'warning' | 'error') => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // WebSocket
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;

  // Utilities
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      authToken: null,
      config: null,
      isLoading: false,
      error: null,
      agents: [],
      selectedAgent: null,
      features: [],
      selectedFeature: null,
      worktrees: [],
      selectedWorktree: null,
      sidebarOpen: true,
      theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
      notifications: [],

      // Auth actions
      login: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiClient.login();
          set({ 
            isAuthenticated: true, 
            authToken: response.token,
            isLoading: false 
          });
          await get().connectWebSocket();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
          get().disconnectWebSocket();
          set({ 
            isAuthenticated: false, 
            authToken: null,
            config: null,
            agents: [],
            features: [],
            worktrees: []
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      checkAuth: async () => {
        try {
          const isAuthenticated = await apiClient.checkAuth();
          set({ isAuthenticated });
          if (isAuthenticated) {
            await get().connectWebSocket();
          }
        } catch (error) {
          set({ isAuthenticated: false });
        }
      },

      // System actions
      loadConfig: async () => {
        try {
          set({ isLoading: true, error: null });
          const config = await apiClient.getConfig();
          set({ config, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load config',
            isLoading: false 
          });
        }
      },

      updateConfig: async (config) => {
        try {
          set({ isLoading: true, error: null });
          const updated = await apiClient.updateConfig(config);
          set({ config: updated, isLoading: false });
          get().addNotification('Configuration updated', 'info');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update config',
            isLoading: false 
          });
          throw error;
        }
      },

      selectProject: async (projectName) => {
        try {
          set({ isLoading: true, error: null });
          await apiClient.selectProject(projectName);
          await get().loadConfig();
          get().addNotification(`Switched to project: ${projectName}`, 'info');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to select project',
            isLoading: false 
          });
          throw error;
        }
      },

      // Agent actions
      loadAgents: async () => {
        try {
          set({ isLoading: true, error: null });
          const agents = await apiClient.getAgents();
          set({ agents, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load agents',
            isLoading: false 
          });
        }
      },

      selectAgent: (agent) => {
        set({ selectedAgent: agent });
      },

      stopAgent: async (agentId) => {
        try {
          await apiClient.stopAgent(agentId);
          get().addNotification(`Agent ${agentId} stopped`, 'info');
          await get().loadAgents();
        } catch (error) {
          get().addNotification(
            error instanceof Error ? error.message : 'Failed to stop agent',
            'error'
          );
          throw error;
        }
      },

      // Feature actions
      loadFeatures: async () => {
        try {
          set({ isLoading: true, error: null });
          const features = await apiClient.getFeatures();
          set({ features, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load features',
            isLoading: false 
          });
        }
      },

      selectFeature: (feature) => {
        set({ selectedFeature: feature });
      },

      createFeature: async (name, description) => {
        try {
          set({ isLoading: true, error: null });
          const feature = await apiClient.createFeature({ name, description });
          const features = [...get().features, feature];
          set({ features, selectedFeature: feature, isLoading: false });
          get().addNotification(`Feature "${name}" created`, 'info');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create feature',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteFeature: async (featureId) => {
        try {
          await apiClient.deleteFeature(featureId);
          const features = get().features.filter(f => f.id !== featureId);
          set({ 
            features,
            selectedFeature: get().selectedFeature?.id === featureId ? null : get().selectedFeature
          });
          get().addNotification('Feature deleted', 'info');
        } catch (error) {
          get().addNotification(
            error instanceof Error ? error.message : 'Failed to delete feature',
            'error'
          );
          throw error;
        }
      },

      assignIssue: async (featureId, issueNumber) => {
        try {
          await apiClient.assignIssue(featureId, issueNumber);
          get().addNotification(`Issue #${issueNumber} assigned`, 'info');
          await get().loadFeatures();
        } catch (error) {
          get().addNotification(
            error instanceof Error ? error.message : 'Failed to assign issue',
            'error'
          );
          throw error;
        }
      },

      // Worktree actions
      loadWorktrees: async () => {
        try {
          set({ isLoading: true, error: null });
          const worktrees = await apiClient.getWorktrees();
          set({ worktrees, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load worktrees',
            isLoading: false 
          });
        }
      },

      selectWorktree: (worktree) => {
        set({ selectedWorktree: worktree });
      },

      createWorktree: async (feature, branch) => {
        try {
          set({ isLoading: true, error: null });
          const worktree = await apiClient.createWorktree({ feature, branch });
          const worktrees = [...get().worktrees, worktree];
          set({ worktrees, selectedWorktree: worktree, isLoading: false });
          get().addNotification('Worktree created', 'info');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create worktree',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteWorktree: async (path) => {
        try {
          await apiClient.deleteWorktree(path);
          const worktrees = get().worktrees.filter(w => w.path !== path);
          set({ 
            worktrees,
            selectedWorktree: get().selectedWorktree?.path === path ? null : get().selectedWorktree
          });
          get().addNotification('Worktree deleted', 'info');
        } catch (error) {
          get().addNotification(
            error instanceof Error ? error.message : 'Failed to delete worktree',
            'error'
          );
          throw error;
        }
      },

      // UI actions
      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },

      addNotification: (message, level = 'info') => {
        const notification = {
          id: Date.now().toString(),
          message,
          level,
          timestamp: new Date(),
        };
        set(state => ({
          notifications: [...state.notifications, notification],
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(notification.id);
        }, 5000);
      },

      removeNotification: (id) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // WebSocket actions
      connectWebSocket: async () => {
        try {
          await wsClient.connect(get().authToken || undefined);

          // Set up event listeners
          wsClient.on('agent:update', (agent: Agent) => {
            set(state => ({
              agents: state.agents.map(a => a.id === agent.id ? agent : a),
            }));
          });

          wsClient.on('feature:update', (feature: Feature) => {
            set(state => ({
              features: state.features.map(f => f.id === feature.id ? feature : f),
            }));
          });

          wsClient.on('worktree:update', (worktree: Worktree) => {
            set(state => ({
              worktrees: state.worktrees.map(w => w.path === worktree.path ? worktree : w),
            }));
          });

          wsClient.on('system:notification', ({ message, level }: { message: string; level: 'info' | 'warning' | 'error' }) => {
            get().addNotification(message, level);
          });
        } catch (error) {
          console.error('WebSocket connection error:', error);
        }
      },

      disconnectWebSocket: () => {
        wsClient.disconnect();
      },

      // Utility actions
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'codettea-store',
    }
  )
);