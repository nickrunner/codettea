import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import our modules
import { stateManager } from '../state/manager';
import { WebSocketManager } from './websocket';
import { corsOptions } from './middleware/cors';
import { logger } from '../utils/logger';
import { apiLimiter, authLimiter } from './middleware/rateLimit';

// Import routes
import systemRoutes from './routes/system';
import agentRoutes from './routes/agents';
import featureRoutes from './routes/features';
import worktreeRoutes from './routes/worktrees';

// Import OpenAPI documentation
import { setupOpenAPI } from './openapi';

export class APIServer {
  private app: Express;
  private server: http.Server;
  private wsManager: WebSocketManager | null = null;
  private port: number;
  private host: string = 'localhost';

  constructor(port?: number) {
    this.port = port || parseInt(process.env.API_PORT || '3456');
    this.app = express();
    this.server = http.createServer(this.app);
  }

  async initialize(): Promise<void> {
    // Initialize state manager
    await stateManager.initialize();

    // Set up middleware
    this.setupMiddleware();

    // Set up routes
    this.setupRoutes();

    // Set up WebSocket server
    this.wsManager = new WebSocketManager(this.server);

    // Set up OpenAPI documentation
    setupOpenAPI(this.app);

    // Error handling
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors(corsOptions));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting - apply to all API routes
    this.app.use('/api/', apiLimiter);
    
    // Stricter rate limiting for auth endpoints
    this.app.use('/api/auth/', authLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Request', { 
        method: req.method, 
        path: req.path,
        ip: req.ip
      });
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', systemRoutes);
    this.app.use('/api/agents', agentRoutes);
    this.app.use('/api/features', featureRoutes);
    this.app.use('/api/worktrees', worktreeRoutes);

    // Health check route (no auth required)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        wsClients: this.wsManager?.getConnectedClients() || 0
      });
    });

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Codettea API Server',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health'
      });
    });

    // Serve static files for UI (when built)
    const uiPath = path.join(__dirname, '../../web/dist');
    this.app.use(express.static(uiPath));

    // Catch-all route for UI (SPA support) - must be after API routes
    this.app.get('*', (req: Request, res: Response) => {
      // Only serve index.html for non-API routes
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(uiPath, 'index.html'));
      } else {
        // Let the 404 handler deal with unknown API routes
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path
      });
    });

    // Error handler
    this.app.use((err: any, req: Request, res: Response, _next: any) => {
      logger.error('Request error', err);
      
      if (err.name === 'UnauthorizedError') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (err.name === 'ValidationError') {
        res.status(400).json({ 
          error: 'Validation Error',
          details: err.details 
        });
        return;
      }

      // Handle JSON parsing errors
      if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'Invalid JSON'
        });
        return;
      }

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        logger.info('API Server started', {
          host: this.host,
          port: this.port,
          endpoints: {
            api: `http://${this.host}:${this.port}`,
            docs: `http://${this.host}:${this.port}/api-docs`,
            websocket: `ws://${this.host}:${this.port}/ws`
          }
        });
        
        // Only show token info in development mode, never log the actual token
        if (process.env.NODE_ENV !== 'production' && !process.env.API_TOKEN) {
          logger.warn('No API_TOKEN configured in environment');
        }
        
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    logger.info('Shutting down API server...');
    
    // Close WebSocket connections
    if (this.wsManager) {
      this.wsManager.close();
    }

    // Save state
    await stateManager.cleanup();

    // Close HTTP server
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('API server stopped');
        resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getApp(): Express {
    return this.app;
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Export for use as module
export default APIServer;

// If run directly, start the server
if (require.main === module) {
  const server = new APIServer();
  server.initialize()
    .then(() => server.start())
    .catch((error) => {
      logger.error('Failed to start server', error as Error);
      process.exit(1);
    });
}