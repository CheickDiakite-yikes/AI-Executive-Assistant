import { Router } from 'express';
import { disconnectGoogle, getGoogleAuthUrl, getIntegrationStatus, handleGoogleCallback, IntegrationError, runIntegrationHealthCheck } from '../services/integrations';
import { getRequestUserId } from '../utils/userIdentity';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const status = await getIntegrationStatus(userId);
    res.json(status);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.post('/google/connect', (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { url } = getGoogleAuthUrl(userId);
    res.json({ authUrl: url });
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    await handleGoogleCallback(code || '', state);
    const redirect = process.env.FRONTEND_URL || '/';
    res.redirect(redirect);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.post('/google/disconnect', async (req, res) => {
  const userId = getRequestUserId(req);
  await disconnectGoogle(userId);
  res.json({ success: true });
});

router.get('/health', async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const result = await runIntegrationHealthCheck(userId);
    res.json(result);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export default router;
