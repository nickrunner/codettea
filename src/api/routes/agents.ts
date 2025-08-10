import { Router, Request, Response } from 'express';
import { stateManager } from '../../state/manager';
import { authMiddleware } from '../middleware/auth';
import { orchestratorIntegration } from '../orchestrator-integration';
import { AgentStatus } from '../../state/types';

const router = Router();

/**
 * @api {get} /api/agents List Agents
 * @apiDescription Get list of all agents and their status
 * @apiGroup Agents
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Array} agents List of agent status objects
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const agents = stateManager.getAllAgents();
  res.json(agents);
});

/**
 * @api {get} /api/agents/:id Get Agent Details
 * @apiDescription Get detailed information about a specific agent
 * @apiGroup Agents
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} id Agent ID
 * @apiSuccess {Object} agent Agent status and details
 */
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const agent = stateManager.getAgent(req.params.id);
  
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  
  res.json(agent);
});

/**
 * @api {post} /api/agents/:id/stop Stop Agent
 * @apiDescription Stop a running agent process
 * @apiGroup Agents
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} id Agent ID
 * @apiSuccess {Object} agent Updated agent status
 */
router.post('/:id/stop', authMiddleware, (req: Request, res: Response) => {
  const agentId = req.params.id;
  
  const success = orchestratorIntegration.stopAgent(agentId);
  
  if (!success) {
    res.status(404).json({ error: 'Agent process not found' });
    return;
  }
  
  try {
    // Update agent status
    stateManager.updateAgent(agentId, {
      status: 'completed',
      endTime: Date.now()
    });
    
    const agent = stateManager.getAgent(agentId);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @api {get} /api/agents/:id/logs Get Agent Logs
 * @apiDescription Get logs for a specific agent
 * @apiGroup Agents
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} id Agent ID
 * @apiQuery {Number} [tail=100] Number of recent log lines to return
 * @apiQuery {Boolean} [stream=false] Stream logs in real-time
 * @apiSuccess {Array} logs Array of log entries
 */
router.get('/:id/logs', authMiddleware, (req: Request, res: Response) => {
  const agent = stateManager.getAgent(req.params.id);
  
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  
  const tail = parseInt(req.query.tail as string) || 100;
  const stream = req.query.stream === 'true';
  
  if (stream) {
    // Set up SSE for streaming logs
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send current logs
    const logs = agent.logs.slice(-tail);
    res.write(`data: ${JSON.stringify({ logs })}\n\n`);
    
    // Set up listener for new logs
    const logListener = (update: any) => {
      if (update.type === 'agent' && update.id === req.params.id) {
        const updatedAgent = update.data as AgentStatus;
        const newLogs = updatedAgent.logs.slice(agent.logs.length);
        if (newLogs.length > 0) {
          res.write(`data: ${JSON.stringify({ logs: newLogs })}\n\n`);
        }
      }
    };
    
    stateManager.on('stateUpdate', logListener);
    
    // Clean up on disconnect
    req.on('close', () => {
      stateManager.removeListener('stateUpdate', logListener);
    });
  } else {
    // Return recent logs
    const logs = agent.logs.slice(-tail);
    res.json({ logs });
  }
});

/**
 * @api {post} /api/agents/spawn Spawn New Agent
 * @apiDescription Start a new agent process (internal use)
 * @apiParam {String} type Agent type (arch|solver|reviewer)
 * @apiParam {String} featureName Feature name
 * @apiParam {Number} [issueNumber] Issue number for solver agents
 * @apiParam {String} [reviewerProfile] Profile for reviewer agents
 */
export async function spawnAgent(
  type: 'arch' | 'solver' | 'reviewer',
  featureName: string,
  options: {
    issueNumber?: number;
    reviewerProfile?: string;
    worktreePath?: string;
    description?: string;
    prNumber?: number;
  } = {}
): Promise<string> {
  const { worktreePath = process.cwd() } = options;
  
  switch (type) {
    case 'arch':
      return orchestratorIntegration.spawnArchitectureAgent(
        featureName,
        options.description || '',
        worktreePath
      );
    
    case 'solver':
      if (!options.issueNumber) {
        throw new Error('Issue number required for solver agent');
      }
      return orchestratorIntegration.spawnSolverAgent(
        featureName,
        options.issueNumber,
        worktreePath
      );
    
    case 'reviewer':
      if (!options.issueNumber || !options.prNumber || !options.reviewerProfile) {
        throw new Error('Issue number, PR number, and reviewer profile required for reviewer agent');
      }
      return orchestratorIntegration.spawnReviewerAgent(
        featureName,
        options.issueNumber,
        options.prNumber,
        options.reviewerProfile,
        worktreePath
      );
    
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

export default router;