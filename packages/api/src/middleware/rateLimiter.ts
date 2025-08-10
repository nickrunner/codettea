import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Create different rate limiters for different endpoints
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ 
      error: 'Too many requests, please try again later.' 
    });
  }
});

// Stricter rate limiting for feature creation
export const createFeatureRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 feature creations per hour
  message: 'Too many feature creation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn(`Feature creation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ 
      error: 'Too many feature creation requests, please try again later.' 
    });
  }
});

// More lenient rate limiting for read operations
export const readRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 read requests per minute
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Read rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ 
      error: 'Too many requests, please slow down.' 
    });
  }
});