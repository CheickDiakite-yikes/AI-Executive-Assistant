import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import notesRouter from './routes/notes';
import canvasRouter from './routes/canvas';
import conversationsRouter from './routes/conversations';
import telemetryRouter from './routes/telemetry';
import emailRouter from './routes/email';
import calendarRouter from './routes/calendar';
import marketRouter from './routes/market';
import integrationsRouter from './routes/integrations';

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001', 10);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/notes', notesRouter);
app.use('/api/canvas', canvasRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/email', emailRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/market', marketRouter);
app.use('/api/integrations', integrationsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, `Maya API server running on http://0.0.0.0:${PORT}`);
  logger.info({
    geminiApiKey: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
  }, 'Environment check');
});

export default app;
