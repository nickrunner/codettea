import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Authentication middleware for API security
 * 
 * This middleware provides basic authentication for API endpoints.
 * In production, this should be replaced with a proper auth solution
 * (OAuth2, JWT, API keys, etc.)
 */

interface AuthConfig {
  enabled: boolean;
  apiKey?: string;
  bypassPaths?: string[];
}

// Configuration - in production, these should come from environment variables
const authConfig: AuthConfig = {
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTH === 'true',
  apiKey: process.env.API_KEY || 'development-key',
  bypassPaths: [
    '/health',
    '/metrics',
    '/docs',
    '/swagger.json',
  ]
};

/**
 * Check if a path should bypass authentication
 */
function shouldBypassAuth(path: string): boolean {
  if (!authConfig.enabled) {
    return true;
  }
  
  return authConfig.bypassPaths?.some(bypassPath => 
    path.startsWith(bypassPath)
  ) || false;
}

/**
 * Validate API key from request headers
 */
function validateApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    return false;
  }
  
  return apiKey === authConfig.apiKey;
}

/**
 * Authentication middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Check if authentication should be bypassed for this path
  if (shouldBypassAuth(req.path)) {
    return next();
  }
  
  // Validate API key
  if (!validateApiKey(req)) {
    logger.warn(`Unauthorized access attempt to ${req.method} ${req.path} from ${req.ip}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }
  
  // Authentication successful
  logger.debug(`Authenticated request to ${req.method} ${req.path}`);
  next();
}

/**
 * Create authentication middleware with custom configuration
 */
export function createAuthMiddleware(config?: Partial<AuthConfig>) {
  if (config) {
    Object.assign(authConfig, config);
  }
  
  return authenticate;
}

/**
 * Express middleware to parse and validate user context
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // For TSOA integration, we need to ensure authentication happens
  // This is called by TSOA's security definitions
  if (!validateApiKey(req)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }
  
  next();
}

/**
 * Optional authentication - allows both authenticated and unauthenticated requests
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  // Check if user provided authentication
  if (validateApiKey(req)) {
    // Mark request as authenticated
    (req as any).authenticated = true;
  } else {
    (req as any).authenticated = false;
  }
  
  next();
}