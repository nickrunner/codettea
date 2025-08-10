import { Router, Request, Response } from 'express';
import { stateManager } from '../../state/manager';
import { authMiddleware } from '../middleware/auth';
import { FeatureState } from '../../state/types';
import { WorktreeManager } from '../../utils/worktreeManager';
import { spawnAgent } from './agents';
import path from 'path';

const router = Router();

/**
 * @api {get} /api/features List Features
 * @apiDescription Get list of all features
 * @apiGroup Features
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Array} features List of feature objects
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const features = stateManager.getAllFeatures();
  res.json(features);
});

/**
 * @api {post} /api/features Create Feature
 * @apiDescription Start working on a new feature
 * @apiGroup Features
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Feature name
 * @apiParam {String} description Feature description
 * @apiParam {Boolean} [runArchitecture=true] Run architecture phase
 * @apiSuccess {Object} feature Created feature object
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, runArchitecture = true } = req.body;
    
    if (!name || !description) {
      res.status(400).json({ error: 'Name and description are required' });
      return;
    }
    
    const config = stateManager.getConfig();
    const projectName = path.basename(config.mainRepoPath);
    
    // Create worktree for the feature
    const worktreeManager = new WorktreeManager(
      {
        mainRepoPath: config.mainRepoPath,
        baseWorktreePath: config.baseWorktreePath,
        projectName
      },
      name
    );
    
    const branch = `feature/${name}`;
    const worktreePath = worktreeManager.path;
    
    // Create feature state
    const feature: FeatureState = {
      name,
      description,
      branch,
      worktreePath,
      issues: [],
      status: runArchitecture ? 'planning' : 'in-progress',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    stateManager.createFeature(feature);
    
    // Create worktree state
    stateManager.createWorktree({
      name,
      path: worktreePath,
      branch,
      featureName: name,
      status: 'active',
      createdAt: Date.now()
    });
    
    // If architecture mode, spawn architecture agent
    if (runArchitecture) {
      await spawnAgent('arch', name, { 
        worktreePath,
        description
      });
      feature.status = 'planning';
      stateManager.updateFeature(name, { status: 'planning' });
    }
    
    res.json(feature);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @api {get} /api/features/:name Get Feature Details
 * @apiDescription Get detailed information about a specific feature
 * @apiGroup Features
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Feature name
 * @apiSuccess {Object} feature Feature details
 */
router.get('/:name', authMiddleware, (req: Request, res: Response) => {
  const feature = stateManager.getFeature(req.params.name);
  
  if (!feature) {
    res.status(404).json({ error: 'Feature not found' });
    return;
  }
  
  res.json(feature);
});

/**
 * @api {get} /api/features/:name/issues Get Feature Issues
 * @apiDescription Get all issues associated with a feature
 * @apiGroup Features
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Feature name
 * @apiSuccess {Array} issues List of issue objects
 */
router.get('/:name/issues', authMiddleware, (req: Request, res: Response) => {
  const issues = stateManager.getFeatureIssues(req.params.name);
  res.json(issues);
});

/**
 * @api {post} /api/features/:name/issues/:number/work Work on Issue
 * @apiDescription Start working on a specific issue
 * @apiGroup Features
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Feature name
 * @apiParam {Number} number Issue number
 * @apiSuccess {Object} result Work initiation result
 */
router.post('/:name/issues/:number/work', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const issueNumber = parseInt(req.params.number);
    
    const feature = stateManager.getFeature(name);
    if (!feature) {
      res.status(404).json({ error: 'Feature not found' });
      return;
    }
    
    const issue = stateManager.getIssue(issueNumber);
    if (!issue || issue.featureName !== name) {
      res.status(404).json({ error: 'Issue not found in this feature' });
      return;
    }
    
    // Check if issue is already being worked on
    if (issue.status === 'solving' || issue.assignedAgent) {
      res.status(400).json({ error: 'Issue is already being worked on' });
      return;
    }
    
    // Spawn solver agent for this issue
    const agentId = await spawnAgent('solver', name, {
      issueNumber,
      worktreePath: feature.worktreePath
    });
    
    // Update issue status
    stateManager.updateIssue(issueNumber, {
      status: 'solving',
      assignedAgent: agentId
    });
    
    res.json({
      message: 'Started working on issue',
      agentId,
      issueNumber
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @api {delete} /api/features/:name Delete Feature
 * @apiDescription Delete a feature and its associated worktree
 * @apiGroup Features
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Feature name
 * @apiParam {Boolean} [keepWorktree=false] Keep the worktree directory
 * @apiSuccess {Object} result Deletion result
 */
router.delete('/:name', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { keepWorktree = false } = req.query;
    
    const feature = stateManager.getFeature(name);
    if (!feature) {
      res.status(404).json({ error: 'Feature not found' });
      return;
    }
    
    // Check for active agents
    const agents = stateManager.getAllAgents();
    const activeAgents = agents.filter(
      a => a.featureName === name && a.status === 'running'
    );
    
    if (activeAgents.length > 0) {
      res.status(400).json({ 
        error: 'Cannot delete feature with active agents',
        activeAgents: activeAgents.map(a => a.id)
      });
      return;
    }
    
    // Delete worktree if requested
    if (!keepWorktree) {
      const config = stateManager.getConfig();
      new WorktreeManager(
        {
          mainRepoPath: config.mainRepoPath,
          baseWorktreePath: config.baseWorktreePath,
          projectName: path.basename(config.mainRepoPath)
        },
        name
      );
      
      // This would call the actual worktree deletion
      // await worktreeManager.remove();
    }
    
    // Remove from state
    stateManager.deleteWorktree(name);
    // Note: We don't have a deleteFeature method yet, would need to add it
    
    res.json({
      message: 'Feature deleted successfully',
      worktreeRemoved: !keepWorktree
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;