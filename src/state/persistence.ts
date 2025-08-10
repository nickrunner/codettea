import fs from 'fs/promises';
import path from 'path';
import { AppState, SystemConfig } from './types';

export class StatePersistence {
  private stateDir: string;
  private statePath: string;
  private configPath: string;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(baseDir: string = '.codettea') {
    this.stateDir = path.join(baseDir, 'state');
    this.statePath = path.join(this.stateDir, 'app-state.json');
    this.configPath = path.join(this.stateDir, 'config.json');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
  }

  async loadState(): Promise<Partial<AppState> | null> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      const rawState = JSON.parse(data);
      
      // Convert arrays back to Maps
      return {
        ...rawState,
        features: new Map(rawState.features || []),
        issues: new Map(rawState.issues || []),
        agents: new Map(rawState.agents || []),
        worktrees: new Map(rawState.worktrees || []),
        sessions: new Map(rawState.sessions || [])
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async saveState(state: AppState): Promise<void> {
    // Debounce saves to avoid excessive file I/O
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      const serializable = {
        ...state,
        features: Array.from(state.features.entries()),
        issues: Array.from(state.issues.entries()),
        agents: Array.from(state.agents.entries()),
        worktrees: Array.from(state.worktrees.entries()),
        sessions: Array.from(state.sessions.entries())
      };

      await fs.writeFile(
        this.statePath,
        JSON.stringify(serializable, null, 2),
        'utf-8'
      );
    }, 500);
  }

  async loadConfig(): Promise<SystemConfig | null> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async saveConfig(config: SystemConfig): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  async cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const state = await this.loadState();
    if (!state || !state.sessions) return;

    const now = Date.now();
    const activeSessions = new Map();
    
    for (const [id, session] of state.sessions) {
      if (now - session.lastAccess < maxAge) {
        activeSessions.set(id, session);
      }
    }

    if (activeSessions.size < state.sessions.size) {
      state.sessions = activeSessions;
      await this.saveState(state as AppState);
    }
  }
}