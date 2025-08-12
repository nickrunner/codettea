import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate limiting middleware to prevent API abuse
 * 
 * This implements a simple in-memory rate limiter.
 * In production, consider using Redis or another distributed store
 * for rate limiting across multiple instances.
 */

interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Maximum requests per window
  message?: string;       // Custom error message
  skipPaths?: string[];   // Paths to skip rate limiting
  keyGenerator?: (req: Request) => string;  // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configuration
const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,     // 100 requests per minute
  message: 'Too many requests, please try again later',
  skipPaths: [
    '/health',
    '/metrics',
    '/docs',
  ],
  keyGenerator: (req: Request) => {
    // Use IP address as the default key
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
};

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Check if a path should skip rate limiting
 */
function shouldSkipRateLimit(path: string, config: RateLimitConfig): boolean {
  return config.skipPaths?.some(skipPath => 
    path.startsWith(skipPath)
  ) || false;
}

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(customConfig?: Partial<RateLimitConfig>) {
  const config = { ...defaultConfig, ...customConfig };
  
  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    // Skip rate limiting for certain paths
    if (shouldSkipRateLimit(req.path, config)) {
      return next();
    }
    
    const key = config.keyGenerator!(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment counter
      entry.count++;
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      logger.warn(`Rate limit exceeded for ${key} - ${req.method} ${req.path}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
      return;
    }
    
    next();
  };
}

/**
 * Specific rate limiters for different endpoints
 */

// Strict rate limiter for expensive operations
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 10,         // 10 requests per minute
  message: 'This endpoint has stricter rate limits. Please wait before trying again.'
});

// Relaxed rate limiter for read operations
export const relaxedRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 200,       // 200 requests per minute
});

// Default rate limiter
export const rateLimiter = createRateLimiter();

/**
 * Per-user rate limiting (requires authentication)
 */
export const userRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 150,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).userId;
    if (userId) {
      return `user:${userId}`;
    }
    return req.ip || 'unknown';
  }
});