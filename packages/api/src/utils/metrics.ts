import { Request, Response, NextFunction } from 'express';
import * as client from 'prom-client';
import { logger } from './logger';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

const apiCallDuration = new client.Histogram({
  name: 'api_call_duration_seconds',
  help: 'Duration of API calls to external services',
  labelNames: ['service', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

const apiCallErrors = new client.Counter({
  name: 'api_call_errors_total',
  help: 'Total number of API call errors',
  labelNames: ['service', 'operation', 'error_type'],
  registers: [register]
});

const featureOperations = new client.Counter({
  name: 'feature_operations_total',
  help: 'Total number of feature operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

const claudeApiCalls = new client.Counter({
  name: 'claude_api_calls_total',
  help: 'Total number of Claude API calls',
  labelNames: ['status'],
  registers: [register]
});

const githubApiCalls = new client.Counter({
  name: 'github_api_calls_total',
  help: 'Total number of GitHub API calls',
  labelNames: ['operation', 'status'],
  registers: [register]
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc();
  
  // Clean up the route for metrics (remove IDs and dynamic segments)
  const route = req.route?.path || req.path || 'unknown';
  const cleanRoute = route
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid');
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: cleanRoute,
      status_code: res.statusCode.toString()
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
    
    // Log slow requests
    if (duration > 5) {
      logger.warn('Slow request detected', {
        method: req.method,
        route: cleanRoute,
        duration,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

// Function to track API call metrics
export const trackApiCall = async <T>(
  service: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = (Date.now() - start) / 1000;
    
    apiCallDuration.observe({ service, operation }, duration);
    
    if (service === 'claude') {
      claudeApiCalls.inc({ status: 'success' });
    } else if (service === 'github') {
      githubApiCalls.inc({ operation, status: 'success' });
    }
    
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    
    apiCallDuration.observe({ service, operation }, duration);
    apiCallErrors.inc({
      service,
      operation,
      error_type: error instanceof Error ? error.constructor.name : 'unknown'
    });
    
    if (service === 'claude') {
      claudeApiCalls.inc({ status: 'error' });
    } else if (service === 'github') {
      githubApiCalls.inc({ operation, status: 'error' });
    }
    
    throw error;
  }
};

// Track feature operations
export const trackFeatureOperation = (operation: string, status: 'success' | 'failure') => {
  featureOperations.inc({ operation, status });
};

// Export registry for metrics endpoint
export const metricsRegistry = register;

// Custom metrics for business logic
export const businessMetrics = {
  // Track feature creation
  trackFeatureCreation: (success: boolean) => {
    trackFeatureOperation('create', success ? 'success' : 'failure');
  },
  
  // Track issue operations
  trackIssueOperation: (operation: string, success: boolean) => {
    trackFeatureOperation(`issue_${operation}`, success ? 'success' : 'failure');
  },
  
  // Track Claude connection tests
  trackClaudeTest: (success: boolean) => {
    claudeApiCalls.inc({ status: success ? 'test_success' : 'test_failure' });
  }
};

// Health metrics for monitoring
export const getHealthMetrics = () => {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external
    },
    uptime: process.uptime(),
    activeConnections: activeConnections.get(),
    nodeVersion: process.version,
    pid: process.pid
  };
};