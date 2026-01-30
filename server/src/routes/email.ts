import { Router } from 'express';
import { getEmailProvider, IntegrationError } from '../services/integrations';
import { updateIntegrationMetadata } from '../services/integrationStore';
import { getRequestUserId } from '../utils/userIdentity';
import { logger } from '../utils/logger';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const query = (req.query.query as string) || '';
    const userId = getRequestUserId(req);
    const provider = getEmailProvider(userId);
    const data = await provider.search(query);
    if (provider.provider === 'google') {
      try {
        await updateIntegrationMetadata(userId, 'google', {
          lastEmailSyncAt: new Date().toISOString(),
          lastEmailAction: 'search',
        });
      } catch (error) {
        logger.error({ error, userId }, 'Failed to update email integration metadata');
      }
    }
    res.json(data);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.post('/draft', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { recipient, subject, body } = req.body;
    const provider = getEmailProvider(userId);
    const response = await provider.draft(recipient, subject, body);
    if (provider.provider === 'google') {
      try {
        await updateIntegrationMetadata(userId, 'google', {
          lastEmailSyncAt: new Date().toISOString(),
          lastEmailAction: 'draft',
        });
      } catch (error) {
        logger.error({ error, userId }, 'Failed to update email integration metadata');
      }
    }
    res.json(response);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.post('/send', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { recipient, subject, body } = req.body;
    const provider = getEmailProvider(userId);
    const response = await provider.send(recipient, subject, body);
    if (provider.provider === 'google') {
      try {
        await updateIntegrationMetadata(userId, 'google', {
          lastEmailSyncAt: new Date().toISOString(),
          lastEmailAction: 'send',
        });
      } catch (error) {
        logger.error({ error, userId }, 'Failed to update email integration metadata');
      }
    }
    res.json(response);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export default router;
