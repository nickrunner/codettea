import { EventEmitter } from 'events';
import crypto from 'crypto';
import path from 'path';
import {
  AppState,
  AgentStatus,
  FeatureState,
  IssueState,
  WorktreeState,
  SystemConfig,
  SessionState,
  StateUpdate
} from './types';
import { StatePersistence } from './persistence';

export class StateManager extends EventEmitter {
  private state: AppState;
  private persistence: StatePersistence;
  private initialized = false;

  constructor() {
    super();
    this.persistence = new StatePersistence();
    this.state = {
      config: this.getDefaultConfig(),
      features: new Map(),
      issues: new Map(),
      agents: new Map(),
      worktrees: new Map(),
      sessions: new Map()
    };
  }

  private getDefaultConfig(): SystemConfig {
    // Generate default token only if not provided via environment
    const apiToken = process.env.API_TOKEN || crypto.randomBytes(32).toString('hex');
    
    // Log only in development mode with warning
    if (!process.env.API_TOKEN && process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  No API_TOKEN provided in environment. Generated a temporary token.');
      console.warn('⚠️  Set API_TOKEN in your .env file for production use.');
    }
    
    return {
      mainRepoPath: process.cwd(),
      baseWorktreePath: path.dirname(process.cwd()),
      maxConcurrentTasks: 2,
      requiredApprovals: 3,
      reviewerProfiles: ['frontend', 'backend', 'devops'],
      apiPort: parseInt(process.env.API_PORT || '3456'),
      apiToken
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.persistence.initialize();
    
    // Load persisted state
    const savedState = await this.persistence.loadState();
    if (savedState) {
      this.state = {
        ...this.state,
        ...savedState
      };
    }

    // Load or create config
    const savedConfig = await this.persistence.loadConfig();
    if (savedConfig) {
      this.state.config = savedConfig;
    } else {
      await this.persistence.saveConfig(this.state.config);
    }

    // Cleanup old sessions
    await this.persistence.cleanupOldSessions();

    this.initialized = true;
  }

  getState(): AppState {
    return this.state;
  }

  getConfig(): SystemConfig {
    return this.state.config;
  }

  async updateConfig(updates: Partial<SystemConfig>): Promise<void> {
    this.state.config = { ...this.state.config, ...updates };
    await this.persistence.saveConfig(this.state.config);
    this.emitUpdate('config', 'update', 'system', this.state.config);
  }

  // Agent management
  createAgent(agent: AgentStatus): void {
    this.state.agents.set(agent.id, agent);
    this.emitUpdate('agent', 'create', agent.id, agent);
    this.save();
  }

  updateAgent(id: string, updates: Partial<AgentStatus>): void {
    const agent = this.state.agents.get(id);
    if (agent) {
      const updated = { ...agent, ...updates };
      this.state.agents.set(id, updated);
      this.emitUpdate('agent', 'update', id, updated);
      this.save();
    }
  }

  deleteAgent(id: string): void {
    this.state.agents.delete(id);
    this.emitUpdate('agent', 'delete', id, null);
    this.save();
  }

  getAgent(id: string): AgentStatus | undefined {
    return this.state.agents.get(id);
  }

  getAllAgents(): AgentStatus[] {
    return Array.from(this.state.agents.values());
  }

  // Feature management
  createFeature(feature: FeatureState): void {
    this.state.features.set(feature.name, feature);
    this.emitUpdate('feature', 'create', feature.name, feature);
    this.save();
  }

  updateFeature(name: string, updates: Partial<FeatureState>): void {
    const feature = this.state.features.get(name);
    if (feature) {
      const updated = { ...feature, ...updates, updatedAt: Date.now() };
      this.state.features.set(name, updated);
      this.emitUpdate('feature', 'update', name, updated);
      this.save();
    }
  }

  getFeature(name: string): FeatureState | undefined {
    return this.state.features.get(name);
  }

  getAllFeatures(): FeatureState[] {
    return Array.from(this.state.features.values());
  }

  // Issue management
  createIssue(issue: IssueState): void {
    this.state.issues.set(issue.number, issue);
    this.emitUpdate('issue', 'create', issue.number, issue);
    this.save();
  }

  updateIssue(number: number, updates: Partial<IssueState>): void {
    const issue = this.state.issues.get(number);
    if (issue) {
      const updated = { ...issue, ...updates };
      this.state.issues.set(number, updated);
      this.emitUpdate('issue', 'update', number, updated);
      this.save();
    }
  }

  getIssue(number: number): IssueState | undefined {
    return this.state.issues.get(number);
  }

  getFeatureIssues(featureName: string): IssueState[] {
    return Array.from(this.state.issues.values())
      .filter(issue => issue.featureName === featureName);
  }

  // Worktree management
  createWorktree(worktree: WorktreeState): void {
    this.state.worktrees.set(worktree.name, worktree);
    this.emitUpdate('worktree', 'create', worktree.name, worktree);
    this.save();
  }

  updateWorktree(name: string, updates: Partial<WorktreeState>): void {
    const worktree = this.state.worktrees.get(name);
    if (worktree) {
      const updated = { ...worktree, ...updates };
      this.state.worktrees.set(name, updated);
      this.emitUpdate('worktree', 'update', name, updated);
      this.save();
    }
  }

  deleteWorktree(name: string): void {
    this.state.worktrees.delete(name);
    this.emitUpdate('worktree', 'delete', name, null);
    this.save();
  }

  getAllWorktrees(): WorktreeState[] {
    return Array.from(this.state.worktrees.values());
  }

  // Session management
  createSession(): SessionState {
    const session: SessionState = {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(32).toString('hex'),
      createdAt: Date.now(),
      lastAccess: Date.now()
    };
    this.state.sessions.set(session.id, session);
    this.save();
    return session;
  }

  validateSession(token: string): SessionState | null {
    for (const session of this.state.sessions.values()) {
      if (session.token === token) {
        session.lastAccess = Date.now();
        this.save();
        return session;
      }
    }
    return null;
  }

  // Agent log management
  appendAgentLog(agentId: string, log: string): void {
    const agent = this.state.agents.get(agentId);
    if (agent) {
      agent.logs.push(log);
      // Limit log history to last 1000 lines
      if (agent.logs.length > 1000) {
        agent.logs = agent.logs.slice(-1000);
      }
      this.emitUpdate('agent', 'update', agentId, agent);
      this.save();
    }
  }

  // State persistence
  private save(): void {
    this.persistence.saveState(this.state).catch(err => {
      console.error('Failed to save state:', err);
    });
  }

  private emitUpdate(type: StateUpdate['type'], action: StateUpdate['action'], id: string | number, data: any): void {
    const update: StateUpdate = { type, action, id, data };
    this.emit('stateUpdate', update);
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.persistence.saveState(this.state);
  }
}

// Singleton instance
export const stateManager = new StateManager();