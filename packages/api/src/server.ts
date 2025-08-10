import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger, httpLogStream } from './utils/logger';
import { metricsMiddleware } from './utils/metrics';
import { authenticateToken, optionalAuth } from './middleware/auth';
import { generalRateLimiter, createFeatureRateLimiter, readRateLimiter } from './middleware/rateLimiter';
import { bodySizeLimit, sanitizeInput } from './middleware/validation';
import 'express-async-errors';

const app: Application = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Parse CORS origins from environment variable (comma-separated)
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [])
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin in development only
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (origin && corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Apply general rate limiting
app.use('/api/', generalRateLimiter);

// Body size limiting and parsing
app.use(bodySizeLimit(1024 * 1024)); // 1MB limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize all inputs
app.use(sanitizeInput);

app.use(morgan('combined', { stream: httpLogStream }));

// Add metrics middleware
app.use(metricsMiddleware);

try {
  const swaggerDocument = require('../dist/swagger.json');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  logger.warn('Swagger documentation not available. Run npm run swagger to generate.');
}

RegisterRoutes(app);

app.use(errorHandler);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
    logger.info(`API documentation available at http://localhost:${PORT}/api/docs`);
    logger.info(`Metrics available at http://localhost:${PORT}/api/metrics`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close((err) => {
      if (err) {
        logger.error('Error during server close:', err);
        process.exit(1);
      }
      
      logger.info('HTTP server closed');
      
      // Close database connections, flush logs, etc.
      // Add any cleanup logic here
      setTimeout(() => {
        logger.info('Graceful shutdown complete');
        process.exit(0);
      }, 100);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}

export default app;