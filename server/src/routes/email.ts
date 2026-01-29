import { Router } from 'express';
import { getEmailProvider, IntegrationError } from '../services/integrations';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const query = (req.query.query as string) || '';
    const provider = getEmailProvider();
    const data = await provider.search(query);
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
    const { recipient, subject, body } = req.body;
    const provider = getEmailProvider();
    const response = await provider.draft(recipient, subject, body);
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
    const { recipient, subject, body } = req.body;
    const provider = getEmailProvider();
    const response = await provider.send(recipient, subject, body);
    res.json(response);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export default router;
