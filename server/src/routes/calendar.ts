import { Router } from 'express';
import { getCalendarProvider, IntegrationError } from '../services/integrations';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const provider = getCalendarProvider();
    const events = await provider.list();
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
    const { title, time, participants } = req.body;
    if (!title || !time) {
      return res.status(400).json({ error: 'title and time are required' });
    }
    const provider = getCalendarProvider();
    const response = await provider.schedule({ title, time, participants });
    res.status(201).json(response);
  } catch (err) {
    if (err instanceof IntegrationError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export default router;
