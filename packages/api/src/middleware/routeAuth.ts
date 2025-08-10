import { Application } from 'express';
import { authenticateToken, optionalAuth } from './auth';
import { createFeatureRateLimiter, readRateLimiter } from './rateLimiter';

export function configureRouteAuth(app: Application) {
  // Health endpoint - no auth required
  app.use('/api/health', readRateLimiter);
  
  // Claude status - optional auth
  app.use('/api/claude', readRateLimiter, optionalAuth);
  
  // Features - authentication required for write operations
  app.get('/api/features', readRateLimiter, optionalAuth);
  app.get('/api/features/:name', readRateLimiter, optionalAuth);
  app.get('/api/features/:name/issues', readRateLimiter, optionalAuth);
  app.post('/api/features', createFeatureRateLimiter, authenticateToken);
  app.patch('/api/features/:name', createFeatureRateLimiter, authenticateToken);
  app.delete('/api/features/:name', createFeatureRateLimiter, authenticateToken);
  
  // Projects - authentication required
  app.use('/api/projects', readRateLimiter, authenticateToken);
  
  // Config - authentication required
  app.use('/api/config', readRateLimiter, authenticateToken);
}