import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      geminiApiKey: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
