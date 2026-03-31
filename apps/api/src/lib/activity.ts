import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ActivityType = 'join' | 'claim' | 'unclaim' | 'event_update' | 'all_claimed';

/**
 * Write an activity log entry for an event.
 * Never throws — failures are logged as warnings so the caller's
 * primary operation is never blocked by audit-log issues.
 */
export async function writeActivity(
  eventId: string,
  userId: string | null,
  type: ActivityType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.from('event_activity').insert({
      event_id: eventId,
      user_id: userId,
      type,
      payload,
    });

    if (error) {
      // Log so we know the audit trail has a gap — but never throw.
      logger.warn('[activity] Failed to write activity log', {
        eventId,
        userId,
        type,
        error: error.message,
        code: error.code,
      });
    }
  } catch (err) {
    logger.warn('[activity] Unexpected error writing activity log', {
      eventId,
      userId,
      type,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
