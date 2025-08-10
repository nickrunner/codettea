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

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
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
    const uiPath = path.join(__dirname, '../../ui/dist');
    this.app.use('/ui', express.static(uiPath));

    // Catch-all route for UI (SPA support)
    this.app.get('/ui/*', (req: Request, res: Response) => {
      res.sendFile(path.join(uiPath, 'index.html'));
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
      console.error('Error:', err);
      
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

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`🚀 API Server running at http://${this.host}:${this.port}`);
        console.log(`📚 API Documentation at http://${this.host}:${this.port}/api-docs`);
        console.log(`🔌 WebSocket endpoint at ws://${this.host}:${this.port}/ws`);
        
        // Display initial token for first-time setup
        const config = stateManager.getConfig();
        console.log('\n🔑 Initial API Token (save this):');
        console.log(config.apiToken);
        console.log('\nUse this token to generate session tokens via POST /api/auth/token');
        
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    console.log('Shutting down API server...');
    
    // Close WebSocket connections
    if (this.wsManager) {
      this.wsManager.close();
    }

    // Save state
    await stateManager.cleanup();

    // Close HTTP server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('API server stopped');
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
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
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
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}