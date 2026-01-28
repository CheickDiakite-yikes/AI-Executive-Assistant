import { Request, Response, NextFunction } from 'express';
import { createCorrelationId, logApiRequest } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();
  req.correlationId = correlationId;
  
  res.setHeader('x-correlation-id', correlationId);
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    logApiRequest(
      req.method,
      req.path,
      res.statusCode,
      durationMs,
      correlationId
    );
  });
  
  next();
}
