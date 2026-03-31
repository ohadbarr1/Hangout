import { createLogger, format, transports } from 'winston';

/**
 * Shared Winston logger instance.
 * Imported by index.ts (server setup), activity.ts, and any other modules
 * that need structured logging — avoids the circular-import problem that
 * arises when every module imports from the entry-point index.ts.
 */
export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp(),
    process.env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.simple()),
  ),
  transports: [new transports.Console()],
});
