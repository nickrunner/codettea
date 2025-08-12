import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate limiting middleware to prevent API abuse
 * Using express-rate-limit for standardized rate limiting
 */

// Default rate limiter configuration
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.ip} - ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests, please try again later',
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for certain paths
    const skipPaths = ['/health', '/metrics', '/docs'];
    return skipPaths.some((path) => req.path.startsWith(path));
  },
});

// Strict rate limiter for expensive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'This endpoint has stricter rate limits. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for ${req.ip} - ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'This endpoint has stricter rate limits. Please wait before trying again.',
    });
  },
});

// Relaxed rate limiter for read operations
export const relaxedRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user rate limiting (requires authentication)
export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150, // Limit each user to 150 requests per windowMs
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).userId;
    if (userId) {
      return `user:${userId}`;
    }
    return req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});