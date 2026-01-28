import { Router } from 'express';
import { db } from '../db';
import { notes } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const allNotes = await db.select().from(notes).orderBy(desc(notes.createdAt));
    res.json(allNotes);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const note = await db.select().from(notes).where(eq(notes.id, req.params.id));
    if (note.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, content, tags, attachmentUrl } = req.body;
    
    const newNote = await db.insert(notes).values({
      title,
      content,
      tags: tags || [],
      attachmentUrl,
    }).returning();
    
    logger.info({ noteId: newNote[0].id }, 'Note created');
    res.status(201).json(newNote[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, content, tags, attachmentUrl } = req.body;
    
    const updated = await db.update(notes)
      .set({
        title,
        content,
        tags,
        attachmentUrl,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, req.params.id))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db.delete(notes).where(eq(notes.id, req.params.id)).returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/tag/:tag', async (req, res, next) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const filteredNotes = await db.select().from(notes)
      .where(sql`${notes.tags}::jsonb @> ${JSON.stringify([tag])}::jsonb`)
      .orderBy(desc(notes.createdAt));
    res.json(filteredNotes);
  } catch (error) {
    next(error);
  }
});

export default router;
