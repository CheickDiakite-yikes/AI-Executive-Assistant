import { Router, Request, Response } from 'express';
import { persistErrorLog, persistToolExecution } from '../services/logPersistence';
import { logger } from '../utils/logger';

const router = Router();

router.post('/error', async (req: Request, res: Response) => {
  try {
    const { message, stack, context, level } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    await persistErrorLog({
      correlationId: req.correlationId,
      source: 'frontend',
      level: level || 'error',
      message,
      stack,
      context: context || {},
    });
    
    logger.warn({ correlationId: req.correlationId, message }, 'Frontend error reported');
    
    res.json({ success: true, correlationId: req.correlationId });
  } catch (err) {
    logger.error({ err }, 'Failed to log frontend error');
    res.status(500).json({ error: 'Failed to log error' });
  }
});

router.post('/tool-execution', async (req: Request, res: Response) => {
  try {
    const { toolName, args, result, status, durationMs, error, voiceSessionId, conversationId } = req.body;
    
    if (!toolName) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    
    await persistToolExecution({
      correlationId: req.correlationId,
      voiceSessionId,
      conversationId,
      toolName,
      args,
      result,
      status: status || 'success',
      durationMs,
      error,
    });
    
    res.json({ success: true, correlationId: req.correlationId });
  } catch (err) {
    logger.error({ err }, 'Failed to log tool execution');
    res.status(500).json({ error: 'Failed to log tool execution' });
  }
});

router.post('/event', async (req: Request, res: Response) => {
  try {
    const { name, data, level } = req.body;
    
    logger.info({ 
      correlationId: req.correlationId, 
      event: name, 
      data,
      level: level || 'info',
    }, `Frontend event: ${name}`);
    
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to log frontend event');
    res.status(500).json({ error: 'Failed to log event' });
  }
});

export default router;
