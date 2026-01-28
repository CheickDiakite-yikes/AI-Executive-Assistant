import { Router } from 'express';
import { db } from '../db';
import { conversations, messages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const allConversations = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
    res.json(allConversations);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    
    const newConversation = await db.insert(conversations).values({
      title: title || 'New Conversation',
    }).returning();
    
    logger.info({ conversationId: newConversation[0].id }, 'Conversation created');
    res.status(201).json(newConversation[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/messages', async (req, res, next) => {
  try {
    const conversationMessages = await db.select().from(messages)
      .where(eq(messages.conversationId, req.params.id))
      .orderBy(messages.createdAt);
    res.json(conversationMessages);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/messages', async (req, res, next) => {
  try {
    const { role, modality, content, metadata } = req.body;
    
    const newMessage = await db.insert(messages).values({
      conversationId: req.params.id,
      role,
      modality: modality || 'text',
      content,
      metadata: metadata || {},
    }).returning();
    
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, req.params.id));
    
    logger.info({ messageId: newMessage[0].id, conversationId: req.params.id }, 'Message added');
    res.status(201).json(newMessage[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
