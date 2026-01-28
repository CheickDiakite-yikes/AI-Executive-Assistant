import { pgTable, text, timestamp, uuid, jsonb, varchar, integer, pgEnum } from 'drizzle-orm/pg-core';

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const emailDirectionEnum = pgEnum('email_direction', ['draft', 'sent', 'received']);
export const canvasItemTypeEnum = pgEnum('canvas_item_type', [
  'email', 'email-draft', 'calendar', 'image', 'code', 'memory', 
  'generated-image', 'system-notification', 'chart', 'web-search', 
  'note', 'note-search-results', 'dossier', 'financial-ticker', 'strategy-memo'
]);
export const imageSourceEnum = pgEnum('image_source', ['screenshot', 'generated', 'uploaded']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  personaId: varchar('persona_id', { length: 50 }).default('maya'),
  preferences: jsonb('preferences').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  role: messageRoleEnum('role').notNull(),
  modality: varchar('modality', { length: 50 }).default('text'),
  content: text('content'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  tags: jsonb('tags').default([]),
  attachmentUrl: text('attachment_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  direction: emailDirectionEnum('direction').notNull(),
  fromAddress: varchar('from_address', { length: 255 }),
  toAddress: varchar('to_address', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  avatar: text('avatar'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  startTime: varchar('start_time', { length: 100 }),
  endTime: varchar('end_time', { length: 100 }),
  participants: jsonb('participants').default([]),
  location: varchar('location', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const canvasItems = pgTable('canvas_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  visitorId: varchar('visitor_id', { length: 100 }),
  type: canvasItemTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: jsonb('content').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const images = pgTable('images', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  source: imageSourceEnum('source').notNull(),
  url: text('url').notNull(),
  caption: text('caption'),
  width: integer('width'),
  height: integer('height'),
  mimeType: varchar('mime_type', { length: 100 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiLogs = pgTable('api_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  correlationId: varchar('correlation_id', { length: 100 }),
  endpoint: varchar('endpoint', { length: 255 }),
  method: varchar('method', { length: 10 }),
  statusCode: integer('status_code'),
  durationMs: integer('duration_ms'),
  error: text('error'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
