import { Request, Response, NextFunction } from 'express';
import { stateManager } from '../../state/manager';

export interface AuthRequest extends Request {
  session?: any;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Validate token with state manager
    const session = stateManager.validateSession(token);
    
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.session = session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(): string {
  const session = stateManager.createSession();
  return session.token;
}