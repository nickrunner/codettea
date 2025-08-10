import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';
import { logger } from '../utils/logger';

interface ErrorResponse {
  message: string;
  details?: unknown;
  stack?: string;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ValidateError) {
    logger.warn(`Validation Failed: ${JSON.stringify(err.fields)}`);
    res.status(422).json({
      message: 'Validation Failed',
      details: err.fields,
    });
    return;
  }

  if (err instanceof Error) {
    logger.error(err);
    const response: ErrorResponse = {
      message: err.message || 'Internal Server Error',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.stack = err.stack;
    }

    res.status(500).json(response);
    return;
  }

  logger.error('Unknown error:', err);
  res.status(500).json({
    message: 'An unknown error occurred',
  });
}