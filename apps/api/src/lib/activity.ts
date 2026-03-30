import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ActivityType = 'join' | 'claim' | 'unclaim' | 'event_update' | 'all_claimed';

export async function writeActivity(
  eventId: string,
  userId: string | null,
  type: ActivityType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('event_activity').insert({
      event_id: eventId,
      user_id: userId,
      type,
      payload,
    });
  } catch {
    // Non-critical — never throw
  }
}
