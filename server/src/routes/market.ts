import { Router } from 'express';
import { getMarketProvider } from '../services/integrations';

const router = Router();

router.get('/:ticker', async (req, res) => {
  const { ticker } = req.params;
  if (!ticker) {
    return res.status(400).json({ error: 'ticker is required' });
  }
  const provider = getMarketProvider();
  const data = await provider.get(ticker);
  res.json(data);
});

export default router;
