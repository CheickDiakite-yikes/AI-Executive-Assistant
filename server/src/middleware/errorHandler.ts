import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = req.correlationId || 'unknown';
  const statusCode = err.statusCode || 500;
  
  logger.error({
    correlationId,
    error: {
      message: err.message,
      stack: err.stack,
      details: err.details,
    },
    request: {
      method: req.method,
      path: req.path,
      body: req.body,
    }
  }, `Unhandled error: ${err.message}`);
  
  res.status(statusCode).json({
    error: {
      message: err.message,
      correlationId,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    }
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
      correlationId: req.correlationId,
    }
  });
}
