import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { integrations } from '../db/schema';
import { logger } from '../utils/logger';

export type IntegrationRecord = typeof integrations.$inferSelect;

export const getIntegrationRecord = async (userId: string, provider: string) => {
  try {
    const records = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
      .orderBy(desc(integrations.updatedAt))
      .limit(1);

    return records[0] || null;
  } catch (error) {
    logger.error({ error, userId, provider }, 'Failed to fetch integration record');
    throw error;
  }
};

export const upsertIntegrationRecord = async (params: {
  userId: string;
  provider: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiryDate?: Date | null;
  metadata?: Record<string, unknown>;
}) => {
  const { userId, provider, accessToken, refreshToken, tokenType, scope, expiryDate, metadata } = params;
  try {
    const existing = await getIntegrationRecord(userId, provider);
    const payload = {
      userId,
      provider,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      tokenType: tokenType || null,
      scope: scope || null,
      expiryDate: expiryDate || null,
      metadata: metadata || existing?.metadata || {},
      updatedAt: new Date(),
    };

    if (existing) {
      const updated = await db
        .update(integrations)
        .set(payload)
        .where(eq(integrations.id, existing.id))
        .returning();
      return updated[0];
    }

    const inserted = await db.insert(integrations).values({
      ...payload,
      connectedAt: new Date(),
    }).returning();

    return inserted[0];
  } catch (error) {
    logger.error({ error, userId, provider }, 'Failed to upsert integration record');
    throw error;
  }
};

export const updateIntegrationMetadata = async (
  userId: string,
  provider: string,
  metadata: Record<string, unknown>,
) => {
  try {
    const existing = await getIntegrationRecord(userId, provider);
    if (!existing) return null;

    const merged = { ...(existing.metadata || {}), ...metadata };
    const updated = await db
      .update(integrations)
      .set({ metadata: merged, updatedAt: new Date() })
      .where(eq(integrations.id, existing.id))
      .returning();
    return updated[0] || null;
  } catch (error) {
    logger.error({ error, userId, provider }, 'Failed to update integration metadata');
    throw error;
  }
};

export const clearIntegrationRecord = async (userId: string, provider: string) => {
  try {
    await db
      .delete(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)));
  } catch (error) {
    logger.error({ error, userId, provider }, 'Failed to clear integration record');
    throw error;
  }
};
