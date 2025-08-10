import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Request body size limiter
export function bodySizeLimit(maxSize: number = 1024 * 1024) { // Default 1MB
  return (req: Request, res: Response, next: NextFunction) => {
    let size = 0;
    
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        logger.warn(`Request body too large from IP: ${req.ip}`);
        res.status(413).json({ error: 'Request body too large' });
        req.destroy();
      }
    });
    
    next();
  };
}

// Sanitize user input to prevent XSS and injection attacks
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  // Recursively sanitize object properties
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove script tags and dangerous HTML
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
}