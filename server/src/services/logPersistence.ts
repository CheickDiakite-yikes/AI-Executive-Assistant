import { db } from '../db';
import { apiLogs, errorLogs, toolExecutions } from '../db/schema';
import { logger } from '../utils/logger';

export async function persistApiLog(data: {
  correlationId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(apiLogs).values({
      correlationId: data.correlationId,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      durationMs: data.durationMs,
      error: data.error,
      metadata: data.metadata || {},
    });
  } catch (err) {
    logger.error({ err, data }, 'Failed to persist API log');
  }
}

export async function persistErrorLog(data: {
  correlationId?: string;
  source: 'frontend' | 'backend' | 'gemini';
  level?: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}) {
  try {
    await db.insert(errorLogs).values({
      correlationId: data.correlationId,
      source: data.source,
      level: data.level || 'error',
      message: data.message,
      stack: data.stack,
      context: data.context || {},
    });
  } catch (err) {
    logger.error({ err, data }, 'Failed to persist error log');
  }
}

export async function persistToolExecution(data: {
  correlationId?: string;
  voiceSessionId?: string;
  conversationId?: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status?: 'success' | 'error';
  durationMs?: number;
  error?: string;
}) {
  try {
    await db.insert(toolExecutions).values({
      correlationId: data.correlationId,
      voiceSessionId: data.voiceSessionId,
      conversationId: data.conversationId,
      toolName: data.toolName,
      args: data.args || {},
      result: data.result || {},
      status: data.status || 'success',
      durationMs: data.durationMs,
      error: data.error,
    });
  } catch (err) {
    logger.error({ err, data }, 'Failed to persist tool execution');
  }
}
