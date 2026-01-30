import { Request, Response, NextFunction } from 'express';
import { createCorrelationId, logApiRequest } from '../utils/logger';
import { persistApiLog } from '../services/logPersistence';

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
    
    persistApiLog({
      correlationId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      metadata: {
        userAgent: req.headers['user-agent'],
        query: req.query,
        userId: req.headers['x-user-id'] || req.headers['x-visitor-id'],
      },
    });
  });
  
  next();
}
