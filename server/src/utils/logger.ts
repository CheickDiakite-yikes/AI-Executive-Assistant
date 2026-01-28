import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
  base: {
    service: 'maya-api',
  },
});

export function createCorrelationId(): string {
  return uuidv4();
}

export function createChildLogger(correlationId: string, context?: Record<string, unknown>) {
  return logger.child({ correlationId, ...context });
}

export function logToolExecution(
  toolName: string, 
  args: unknown, 
  result: unknown, 
  durationMs: number, 
  correlationId: string,
  error?: Error
) {
  const log = createChildLogger(correlationId, { tool: toolName });
  
  if (error) {
    log.error({
      args,
      durationMs,
      error: {
        message: error.message,
        stack: error.stack,
      }
    }, `Tool execution failed: ${toolName}`);
  } else {
    log.info({
      args,
      durationMs,
      resultPreview: typeof result === 'object' ? 'object' : result,
    }, `Tool executed: ${toolName}`);
  }
}

export function logGeminiCall(
  action: string,
  durationMs: number,
  correlationId: string,
  metadata?: Record<string, unknown>,
  error?: Error
) {
  const log = createChildLogger(correlationId, { gemini: true });
  
  if (error) {
    log.error({
      action,
      durationMs,
      metadata,
      error: {
        message: error.message,
        stack: error.stack,
      }
    }, `Gemini API error: ${action}`);
  } else {
    log.info({
      action,
      durationMs,
      metadata,
    }, `Gemini API call: ${action}`);
  }
}

export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  correlationId: string,
  error?: string
) {
  const log = createChildLogger(correlationId);
  
  const logData = {
    method,
    path,
    statusCode,
    durationMs,
    error,
  };
  
  if (statusCode >= 500) {
    log.error(logData, `API Error: ${method} ${path}`);
  } else if (statusCode >= 400) {
    log.warn(logData, `API Warning: ${method} ${path}`);
  } else {
    log.info(logData, `API Request: ${method} ${path}`);
  }
}
