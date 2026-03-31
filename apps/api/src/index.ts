import express from 'express';
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

// ─── Sentry (optional — only initialised when SENTRY_DSN is set) ──────────────
// Must be imported before routes to instrument them properly.
if (process.env.SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
  } catch {
    // @sentry/node not installed — skip silently
  }
}

import { logger } from './lib/logger';
import { eventsRouter } from './routes/events';
import { itemsRouter } from './routes/items';
import { assignmentsRouter } from './routes/assignments';
import { invitesRouter } from './routes/invites';
import { parseRouter } from './routes/parse';
import { usersRouter } from './routes/users';
import type { AuthenticatedRequest } from './middleware/auth';

// Re-export logger so other modules that import from 'index' still work
export { logger };

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Security Headers ─────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true,
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute
  max: 120,                      // 120 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many requests, please slow down.', code: 'RATE_LIMITED' } },
});

const parseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,     // 1 hour
  max: 30,                       // 30 AI parses/hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'AI parse limit reached. Try again in an hour.', code: 'RATE_LIMITED' } },
});

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 minutes
  max: 60,                       // 60 invite lookups/15min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many requests.', code: 'RATE_LIMITED' } },
});

app.use(generalLimiter);
app.use('/events/parse', parseLimiter);
app.use('/invites', inviteLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
// Logs method, path, status, latency, and user_id (when authenticated).

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      user_id: (req as AuthenticatedRequest).userId ?? undefined,
    });
  });
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {};

  // DB check
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from('events').select('id').limit(1);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Claude API check (just verify key exists)
  checks.claude = process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing';

  // Sentry check
  checks.sentry = process.env.SENTRY_DSN ? 'configured' : 'not_configured';

  const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'configured' || v === 'not_configured');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime_s: Math.round(process.uptime()),
    checks,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/events', parseRouter);
app.use('/events', eventsRouter);
app.use('/items', itemsRouter);
app.use('/items', assignmentsRouter);
app.use('/', invitesRouter);
app.use('/users', usersRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ message: err.message, stack: err.stack });

  // Forward to Sentry if configured
  if (process.env.SENTRY_DSN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@sentry/node').captureException(err);
    } catch {
      // Sentry not installed — skip
    }
  }

  res.status(500).json({
    data: null,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info(`Hangout API running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
    logger.info(`Sentry: ${process.env.SENTRY_DSN ? 'enabled' : 'disabled (set SENTRY_DSN to enable)'}`);
  });
}

export default app;
