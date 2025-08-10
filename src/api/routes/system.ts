import { Router, Request, Response } from 'express';
import { stateManager } from '../../state/manager';
import { authMiddleware } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

/**
 * @api {get} /api/health Health Check
 * @apiDescription Check if the API server is running
 * @apiGroup System
 * @apiSuccess {String} status Server status
 * @apiSuccess {Number} uptime Server uptime in seconds
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

/**
 * @api {get} /api/config Get Configuration
 * @apiDescription Get current system configuration
 * @apiGroup System
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Object} config System configuration object
 */
router.get('/config', authMiddleware, (req: Request, res: Response) => {
  const config = stateManager.getConfig();
  // Don't expose the API token
  const { apiToken: _, ...safeConfig } = config;
  res.json(safeConfig);
});

/**
 * @api {patch} /api/config Update Configuration
 * @apiDescription Update system configuration parameters
 * @apiGroup System
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {Object} updates Configuration updates
 * @apiSuccess {Object} config Updated configuration
 */
router.patch('/config', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { apiToken: _token, ...updates } = req.body; // Don't allow updating API token via API
    await stateManager.updateConfig(updates);
    const config = stateManager.getConfig();
    const { apiToken: _, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * @api {get} /api/projects List Projects
 * @apiDescription List available projects in the base worktree path
 * @apiGroup System
 * @apiHeader {String} Authorization Bearer token
 * @apiSuccess {Array} projects List of project directories
 */
router.get('/projects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const config = stateManager.getConfig();
    const entries = await fs.readdir(config.baseWorktreePath, { withFileTypes: true });
    
    const projects = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(config.baseWorktreePath, entry.name);
        try {
          // Check if it's a git repository
          await fs.access(path.join(projectPath, '.git'));
          projects.push({
            name: entry.name,
            path: projectPath,
            isCurrent: projectPath === config.mainRepoPath
          });
        } catch {
          // Not a git repo, skip
        }
      }
    }
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @api {post} /api/projects/select Select Project
 * @apiDescription Select the active project to work with
 * @apiGroup System
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} path Project path
 * @apiSuccess {Object} config Updated configuration
 */
router.post('/projects/select', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { path: projectPath } = req.body;
    
    if (!projectPath) {
      res.status(400).json({ error: 'Project path is required' });
      return;
    }
    
    // Verify the path exists and is a git repository
    await fs.access(path.join(projectPath, '.git'));
    
    await stateManager.updateConfig({ mainRepoPath: projectPath });
    const config = stateManager.getConfig();
    const { apiToken: _, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    res.status(400).json({ error: 'Invalid project path or not a git repository' });
  }
});

/**
 * @api {post} /api/auth/token Generate Token
 * @apiDescription Generate a new authentication token
 * @apiGroup System
 * @apiParam {String} secret API secret (from environment)
 * @apiSuccess {String} token Authentication token
 */
router.post('/auth/token', (req: Request, res: Response) => {
  const { secret } = req.body;
  const config = stateManager.getConfig();
  
  // Simple secret-based auth for token generation
  if (secret !== config.apiToken) {
    res.status(401).json({ error: 'Invalid secret' });
    return;
  }
  
  const session = stateManager.createSession();
  res.json({ token: session.token, sessionId: session.id });
});

export default router;