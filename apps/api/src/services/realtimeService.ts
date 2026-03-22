/**
 * Supabase Realtime helpers for the API server.
 *
 * In most cases, the mobile app subscribes directly to Supabase Realtime
 * via the @supabase/supabase-js client. This module provides server-side
 * utilities for broadcasting custom events and managing channels when
 * the backend needs to push updates programmatically.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type RealtimeEventName =
  | 'event:updated'
  | 'item:claimed'
  | 'item:unclaimed'
  | 'item:added'
  | 'item:deleted'
  | 'member:joined'
  | 'member:rsvp_updated';

interface BroadcastPayload {
  event: RealtimeEventName;
  payload: Record<string, unknown>;
}

/**
 * Broadcast a custom event to all subscribers of an event channel.
 * Mobile clients subscribed to `event:{eventId}` will receive this.
 *
 * @param eventId - The Hangout event UUID
 * @param message - The event type + payload to broadcast
 */
export async function broadcastToEvent(
  eventId: string,
  message: BroadcastPayload,
): Promise<void> {
  const channel = supabase.channel(`event:${eventId}`);

  await channel.send({
    type: 'broadcast',
    event: message.event,
    payload: message.payload,
  });

  await supabase.removeChannel(channel);
}

/**
 * Broadcast an item claimed event.
 */
export async function broadcastItemClaimed(
  eventId: string,
  itemId: string,
  claimedBy: { id: string; name: string; avatar_url: string | null },
): Promise<void> {
  return broadcastToEvent(eventId, {
    event: 'item:claimed',
    payload: { itemId, claimedBy },
  });
}

/**
 * Broadcast an item unclaimed event.
 */
export async function broadcastItemUnclaimed(
  eventId: string,
  itemId: string,
): Promise<void> {
  return broadcastToEvent(eventId, {
    event: 'item:unclaimed',
    payload: { itemId },
  });
}

/**
 * Broadcast a new member joining an event.
 */
export async function broadcastMemberJoined(
  eventId: string,
  member: { id: string; name: string; avatar_url: string | null },
): Promise<void> {
  return broadcastToEvent(eventId, {
    event: 'member:joined',
    payload: { member },
  });
}
