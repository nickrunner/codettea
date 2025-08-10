import { Router, Request, Response } from 'express';
import { stateManager } from '../../state/manager';
import { authMiddleware } from '../middleware/auth';
import { WorktreeManager } from '../../utils/worktreeManager';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const router = Router();
const execAsync = promisify(exec);

/**
 * @api {get} /api/worktrees List Worktrees
 * @apiDescription Get list of all worktrees
 * @apiGroup Worktrees
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Array} worktrees List of worktree objects
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const worktrees = stateManager.getAllWorktrees();
  res.json(worktrees);
});

/**
 * @api {post} /api/worktrees Create Worktree
 * @apiDescription Create a new worktree
 * @apiGroup Worktrees
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Worktree name
 * @apiParam {String} branch Branch name
 * @apiSuccess {Object} worktree Created worktree object
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, branch } = req.body;
    
    if (!name || !branch) {
      res.status(400).json({ error: 'Name and branch are required' });
      return;
    }
    
    const config = stateManager.getConfig();
    const projectName = path.basename(config.mainRepoPath);
    
    const worktreeManager = new WorktreeManager(
      {
        mainRepoPath: config.mainRepoPath,
        baseWorktreePath: config.baseWorktreePath,
        projectName
      },
      name
    );
    
    // Create the worktree (this would call the actual git worktree add command)
    // For now, we'll just create the state
    const worktreePath = worktreeManager.path;
    
    stateManager.createWorktree({
      name,
      path: worktreePath,
      branch,
      featureName: name,
      status: 'active',
      createdAt: Date.now()
    });
    
    res.json({
      name,
      path: worktreePath,
      branch,
      status: 'active'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @api {delete} /api/worktrees/:name Remove Worktree
 * @apiDescription Remove a worktree
 * @apiGroup Worktrees
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Worktree name
 * @apiParam {Boolean} [force=false] Force removal
 * @apiSuccess {Object} result Removal result
 */
router.delete('/:name', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { force = false } = req.query;
    
    const worktree = stateManager.getAllWorktrees().find(w => w.name === name);
    if (!worktree) {
      res.status(404).json({ error: 'Worktree not found' });
      return;
    }
    
    // Check for active agents using this worktree
    const agents = stateManager.getAllAgents();
    const activeAgents = agents.filter(
      a => a.featureName === worktree.featureName && a.status === 'running'
    );
    
    if (activeAgents.length > 0 && !force) {
      res.status(400).json({ 
        error: 'Worktree has active agents',
        activeAgents: activeAgents.map(a => a.id)
      });
      return;
    }
    
    // Remove from state
    stateManager.deleteWorktree(name);
    
    // Actually remove the worktree (would call git worktree remove)
    const config = stateManager.getConfig();
    try {
      await execAsync(`git worktree remove ${worktree.path}`, {
        cwd: config.mainRepoPath
      });
    } catch (error) {
      // Worktree might already be removed
      console.error('Failed to remove worktree:', error);
    }
    
    res.json({
      message: 'Worktree removed successfully',
      name
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @api {get} /api/worktrees/:name/status Get Worktree Status
 * @apiDescription Get git status for a worktree
 * @apiGroup Worktrees
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} name Worktree name
 * @apiSuccess {Object} status Git status information
 */
router.get('/:name/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    const worktree = stateManager.getAllWorktrees().find(w => w.name === name);
    if (!worktree) {
      res.status(404).json({ error: 'Worktree not found' });
      return;
    }
    
    // Get git status
    const { stdout: statusOutput } = await execAsync('git status --porcelain', {
      cwd: worktree.path
    });
    
    // Get current branch
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: worktree.path
    });
    
    // Get last commit
    const { stdout: commitOutput } = await execAsync('git log -1 --oneline', {
      cwd: worktree.path
    });
    
    // Parse status output
    const files = statusOutput.split('\n').filter(line => line.trim()).map(line => {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      return { status, file };
    });
    
    res.json({
      worktree: name,
      branch: branchOutput.trim(),
      lastCommit: commitOutput.trim(),
      files,
      clean: files.length === 0
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;