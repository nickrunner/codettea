import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { stateManager } from '../state/manager';
import { AgentStatus } from '../state/types';
import { WebSocketManager } from './websocket';

interface RunningAgent {
  process: ChildProcess;
  agentId: string;
  type: 'arch' | 'solver' | 'reviewer';
  featureName: string;
  issueNumber?: number;
}

class OrchestratorIntegration {
  private runningAgents: Map<string, RunningAgent> = new Map();
  private wsManager: WebSocketManager | null = null;

  setWebSocketManager(manager: WebSocketManager): void {
    this.wsManager = manager;
  }

  async spawnArchitectureAgent(
    featureName: string,
    description: string,
    worktreePath: string
  ): Promise<string> {
    const agentId = `arch-${featureName}-${Date.now()}`;
    
    // Create agent status
    const agent: AgentStatus = {
      id: agentId,
      type: 'arch',
      status: 'running',
      featureName,
      startTime: Date.now(),
      logs: []
    };
    
    stateManager.createAgent(agent);

    // Spawn the orchestrator process in architecture mode
    const orchestratorPath = path.join(__dirname, '../orchestrator.ts');
    const args = [
      orchestratorPath,
      featureName,
      description,
      '--arch',
      '--worktree', worktreePath
    ];

    const childProcess = spawn('tsx', args, {
      cwd: worktreePath,
      env: {
        ...process.env,
        AGENT_ID: agentId,
        FEATURE_NAME: featureName
      }
    });

    // Capture output
    childProcess.stdout?.on('data', (data: Buffer) => {
      const log = data.toString();
      stateManager.appendAgentLog(agentId, log);
      this.wsManager?.broadcastAgentLog(agentId, log);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const log = data.toString();
      stateManager.appendAgentLog(agentId, log);
      this.wsManager?.broadcastAgentLog(agentId, log);
    });

    childProcess.on('exit', (code: number | null) => {
      stateManager.updateAgent(agentId, {
        status: code === 0 ? 'completed' : 'failed',
        endTime: Date.now(),
        error: code !== 0 ? `Process exited with code ${code}` : undefined
      });
      this.runningAgents.delete(agentId);
    });

    this.runningAgents.set(agentId, {
      process: childProcess,
      agentId,
      type: 'arch',
      featureName
    });

    return agentId;
  }

  async spawnSolverAgent(
    featureName: string,
    issueNumber: number,
    worktreePath: string,
    attemptNumber: number = 1
  ): Promise<string> {
    const agentId = `solver-${issueNumber}-${attemptNumber}-${Date.now()}`;
    
    // Create agent status
    const agent: AgentStatus = {
      id: agentId,
      type: 'solver',
      status: 'running',
      featureName,
      issueNumber,
      startTime: Date.now(),
      logs: []
    };
    
    stateManager.createAgent(agent);

    // Spawn the orchestrator process for specific issue
    const orchestratorPath = path.join(__dirname, '../orchestrator.ts');
    const args = [
      orchestratorPath,
      featureName,
      issueNumber.toString(),
      '--worktree', worktreePath
    ];

    const childProcess = spawn('tsx', args, {
      cwd: worktreePath,
      env: {
        ...process.env,
        AGENT_ID: agentId,
        FEATURE_NAME: featureName,
        ISSUE_NUMBER: issueNumber.toString(),
        ATTEMPT_NUMBER: attemptNumber.toString()
      }
    });

    // Capture output
    childProcess.stdout?.on('data', (data: Buffer) => {
      const log = data.toString();
      stateManager.appendAgentLog(agentId, log);
      this.wsManager?.broadcastAgentLog(agentId, log);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const log = data.toString();
      stateManager.appendAgentLog(agentId, log);
      this.wsManager?.broadcastAgentLog(agentId, log);
    });

    childProcess.on('exit', (code: number | null) => {
      stateManager.updateAgent(agentId, {
        status: code === 0 ? 'completed' : 'failed',
        endTime: Date.now(),
        error: code !== 0 ? `Process exited with code ${code}` : undefined
      });
      
      // Update issue status
      stateManager.updateIssue(issueNumber, {
        status: code === 0 ? 'reviewing' : 'rejected',
        attempts: attemptNumber
      });
      
      this.runningAgents.delete(agentId);
    });

    this.runningAgents.set(agentId, {
      process: childProcess,
      agentId,
      type: 'solver',
      featureName,
      issueNumber
    });

    return agentId;
  }

  async spawnReviewerAgent(
    featureName: string,
    issueNumber: number,
    prNumber: number,
    reviewerProfile: string,
    worktreePath: string
  ): Promise<string> {
    const agentId = `reviewer-${reviewerProfile}-${issueNumber}-${Date.now()}`;
    
    // Create agent status
    const agent: AgentStatus = {
      id: agentId,
      type: 'reviewer',
      status: 'running',
      featureName,
      issueNumber,
      startTime: Date.now(),
      logs: []
    };
    
    stateManager.createAgent(agent);

    // Spawn reviewer process
    const childProcess = spawn('claude', [
      'code',
      '--dangerously-skip-permissions',
      '--prompt-file', path.join(__dirname, `../prompts/profiles/${reviewerProfile}/review.md`)
    ], {
      cwd: worktreePath,
      env: {
        ...process.env,
        AGENT_ID: agentId,
        FEATURE_NAME: featureName,
        ISSUE_NUMBER: issueNumber.toString(),
        PR_NUMBER: prNumber.toString(),
        REVIEWER_PROFILE: reviewerProfile
      }
    });

    // Capture output
    childProcess.stdout?.on('data', (data: Buffer) => {
      const log = data.toString();
      stateManager.appendAgentLog(agentId, log);
      this.wsManager?.broadcastAgentLog(agentId, log);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const log = data.toString();
      stateManager.appendAgentLog(agentId, log);
      this.wsManager?.broadcastAgentLog(agentId, log);
    });

    childProcess.on('exit', (code: number | null) => {
      stateManager.updateAgent(agentId, {
        status: code === 0 ? 'completed' : 'failed',
        endTime: Date.now(),
        error: code !== 0 ? `Process exited with code ${code}` : undefined
      });
      this.runningAgents.delete(agentId);
    });

    this.runningAgents.set(agentId, {
      process: childProcess,
      agentId,
      type: 'reviewer',
      featureName,
      issueNumber
    });

    return agentId;
  }

  stopAgent(agentId: string): boolean {
    const agent = this.runningAgents.get(agentId);
    if (!agent) {
      return false;
    }

    // Send SIGTERM to gracefully stop
    agent.process.kill('SIGTERM');
    
    // Give it 5 seconds to stop gracefully, then force kill
    setTimeout(() => {
      if (this.runningAgents.has(agentId)) {
        agent.process.kill('SIGKILL');
      }
    }, 5000);

    return true;
  }

  stopAllAgents(): void {
    for (const [agentId] of this.runningAgents) {
      this.stopAgent(agentId);
    }
  }

  getRunningAgents(): string[] {
    return Array.from(this.runningAgents.keys());
  }

  isAgentRunning(agentId: string): boolean {
    return this.runningAgents.has(agentId);
  }
}

export const orchestratorIntegration = new OrchestratorIntegration();