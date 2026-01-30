import { Router } from 'express';
import { getCalendarProvider, IntegrationError } from '../services/integrations';
import { updateIntegrationMetadata } from '../services/integrationStore';
import { getRequestUserId } from '../utils/userIdentity';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const userId = getRequestUserId(_req);
    const provider = getCalendarProvider(userId);
    const events = await provider.list();
    if (provider.provider === 'google') {
      try {
        await updateIntegrationMetadata(userId, 'google', {
          lastCalendarSyncAt: new Date().toISOString(),
          lastCalendarAction: 'list',
        });
      } catch (error) {
        logger.error({ error, userId }, 'Failed to update calendar integration metadata');
      }
    }
    res.json({ events });
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { title, time, participants } = req.body;
    if (!title || !time) {
      return res.status(400).json({ error: 'title and time are required' });
    }
    const provider = getCalendarProvider(userId);
    const response = await provider.schedule({ title, time, participants });
    if (provider.provider === 'google') {
      try {
        await updateIntegrationMetadata(userId, 'google', {
          lastCalendarSyncAt: new Date().toISOString(),
          lastCalendarAction: 'schedule',
        });
      } catch (error) {
        logger.error({ error, userId }, 'Failed to update calendar integration metadata');
      }
    }
    res.status(201).json(response);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export default router;
