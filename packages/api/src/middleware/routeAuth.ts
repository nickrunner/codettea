import { Application } from 'express';
import { authenticateToken, optionalAuth } from './auth';
import { strictRateLimiter, relaxedRateLimiter } from './rateLimiter';

export function configureRouteAuth(app: Application) {
  // Health endpoint - no auth required
  app.use('/api/health', relaxedRateLimiter);
  
  // Claude status - optional auth
  app.use('/api/claude', relaxedRateLimiter, optionalAuth);
  
  // Features - authentication required for write operations
  app.get('/api/features', relaxedRateLimiter, optionalAuth);
  app.get('/api/features/:name', relaxedRateLimiter, optionalAuth);
  app.get('/api/features/:name/issues', relaxedRateLimiter, optionalAuth);
  app.post('/api/features', strictRateLimiter, authenticateToken);
  app.patch('/api/features/:name', strictRateLimiter, authenticateToken);
  app.delete('/api/features/:name', strictRateLimiter, authenticateToken);
  
  // Projects - authentication required
  app.use('/api/projects', relaxedRateLimiter, authenticateToken);
  
  // Config - authentication required
  app.use('/api/config', relaxedRateLimiter, authenticateToken);
}