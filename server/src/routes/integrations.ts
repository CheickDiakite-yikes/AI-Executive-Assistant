import { Router } from 'express';
import { disconnectGoogle, getGoogleAuthUrl, getIntegrationStatus, handleGoogleCallback, IntegrationError } from '../services/integrations';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getIntegrationStatus());
});

router.post('/google/connect', (_req, res) => {
  try {
    const { url } = getGoogleAuthUrl();
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

router.post('/google/disconnect', (_req, res) => {
  disconnectGoogle();
  res.json({ success: true });
});

export default router;
