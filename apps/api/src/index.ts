import express from 'express';
// Only load .env file locally — Vercel injects env vars directly
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
import cors from 'cors';

import { eventsRouter } from './routes/events';
import { itemsRouter } from './routes/items';
import { assignmentsRouter } from './routes/assignments';
import { invitesRouter } from './routes/invites';
import { parseRouter } from './routes/parse';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/events', parseRouter);   // POST /events/parse — must be before eventsRouter
app.use('/events', eventsRouter);
app.use('/items', itemsRouter);
app.use('/items', assignmentsRouter);
app.use('/', invitesRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message, err.stack);
  res.status(500).json({
    data: null,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

// Only start the HTTP server when running locally (not in Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Hangout API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

export default app;
