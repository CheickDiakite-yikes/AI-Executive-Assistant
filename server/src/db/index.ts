import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '../utils/logger';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

logger.info('Database connection initialized');
