import { Router } from 'express';
import { db } from '../db';
import { canvasItems } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const visitorId = req.query.visitorId as string || 'default';
    const items = await db.select().from(canvasItems)
      .where(eq(canvasItems.visitorId, visitorId))
      .orderBy(desc(canvasItems.createdAt));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, title, content, visitorId } = req.body;
    
    const newItem = await db.insert(canvasItems).values({
      type,
      title,
      content,
      visitorId: visitorId || 'default',
    }).returning();
    
    logger.info({ itemId: newItem[0].id, type }, 'Canvas item created');
    res.status(201).json(newItem[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db.delete(canvasItems).where(eq(canvasItems.id, req.params.id)).returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Canvas item not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    const visitorId = req.query.visitorId as string || 'default';
    await db.delete(canvasItems).where(eq(canvasItems.visitorId, visitorId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
