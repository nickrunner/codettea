import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Simple token-based authentication for localhost
// In production, replace with proper auth mechanism
const VALID_TOKENS = new Set([
  process.env.API_TOKEN || 'development-token-2024'
]);

export interface AuthenticatedRequest extends Request {
  userId?: string;
  isAuthenticated?: boolean;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Allow localhost connections without auth in development
    if (process.env.NODE_ENV === 'development' && req.hostname === 'localhost') {
      req.isAuthenticated = true;
      req.userId = 'local-dev';
      return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn(`Authentication failed: No token provided from ${req.ip}`);
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!VALID_TOKENS.has(token)) {
      logger.warn(`Authentication failed: Invalid token from ${req.ip}`);
      return res.status(403).json({ error: 'Invalid authentication token' });
    }

    req.isAuthenticated = true;
    req.userId = 'authenticated-user';
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Optional auth middleware - allows both authenticated and unauthenticated requests
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && VALID_TOKENS.has(token)) {
    req.isAuthenticated = true;
    req.userId = 'authenticated-user';
  } else {
    req.isAuthenticated = false;
  }

  next();
}