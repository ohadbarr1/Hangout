/**
 * API client for the Hangout backend.
 * All AI calls go through the backend (never directly from the mobile app)
 * so we don't expose the Anthropic API key on-device.
 */

import { supabase } from './supabase';
import type {
  Event,
  Item,
  Assignment,
  EventMember,
  Invite,
  ParsedEventResponse,
  CreateItemPayload,
  ClaimItemPayload,
  AcceptInvitePayload,
} from '@hangout/shared';

export interface ActivityItem {
  id: string;
  event_id: string;
  user_id: string | null;
  type: 'join' | 'claim' | 'unclaim' | 'event_update' | 'all_claimed';
  payload: Record<string, unknown>;
  created_at: string;
  user?: { id: string; name: string; avatar_url: string | null } | null;
}

export interface ItemComment {
  id: string;
  item_id: string;
  event_id: string;
  user_id: string;
  text: string;
  created_at: string;
  user?: { id: string; name: string; avatar_url: string | null } | null;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request failed: ${response.status}`);
  }

  return json.data as T;
}

// ─── Event endpoints ──────────────────────────────────────────────────────────

export const apiClient = {
  // Parse event description with AI
  parseEvent: (description: string): Promise<ParsedEventResponse> =>
    request('POST', '/events/parse', { description }),

  // Create event (title + items) from AI-parsed data
  createEventFromParsed: (
    description: string,
    parsed: ParsedEventResponse,
  ): Promise<Event> =>
    request('POST', '/events', {
      title: parsed.eventName,
      description,
      // Only send event_date if it looks like a real date (ISO 8601)
      ...(parsed.suggestedDate && /^\d{4}-\d{2}-\d{2}/.test(parsed.suggestedDate)
        ? { event_date: parsed.suggestedDate }
        : {}),
      parsed_categories: parsed.categories,
      estimated_guests: parsed.estimatedGuests,
    }),

  // Fetch single event
  getEvent: (id: string): Promise<Event> =>
    request('GET', `/events/${id}`),

  // Fetch user's events
  getMyEvents: (): Promise<Event[]> =>
    request('GET', '/events'),

  // Fetch event members
  getEventMembers: (eventId: string): Promise<EventMember[]> =>
    request('GET', `/events/${eventId}/members`),

  // ─── Item endpoints ────────────────────────────────────────────────────────

  getItems: (eventId: string): Promise<Item[]> =>
    request('GET', `/items/events/${eventId}/items`),

  addItem: (eventId: string, payload: CreateItemPayload): Promise<Item> =>
    request('POST', `/items/events/${eventId}/items`, payload),

  deleteItem: (itemId: string): Promise<void> =>
    request('DELETE', `/items/${itemId}`),

  // ─── Assignment endpoints ──────────────────────────────────────────────────

  claimItem: (itemId: string, payload?: ClaimItemPayload): Promise<Assignment> =>
    request('POST', `/items/${itemId}/claim`, payload ?? {}),

  unclaimItem: (itemId: string): Promise<void> =>
    request('DELETE', `/items/${itemId}/unclaim`),

  // ─── Invite endpoints ─────────────────────────────────────────────────────

  createInvite: (eventId: string): Promise<Invite> =>
    request('POST', `/events/${eventId}/invites`),

  getInvite: (token: string): Promise<Invite> =>
    request('GET', `/invites/${token}`),

  acceptInvite: (token: string, payload?: AcceptInvitePayload): Promise<EventMember> =>
    request('POST', `/invites/${token}/accept`, payload ?? {}),

  // ─── Event update ──────────────────────────────────────────────────────────

  updateEvent: (id: string, data: Partial<{title: string, description: string, event_date: string, location: string, hero_color: string, status: string}>): Promise<Event> =>
    request('PATCH', `/events/${id}`, data),

  // ─── Event delete ──────────────────────────────────────────────────────────

  deleteEvent: (id: string): Promise<void> =>
    request('DELETE', `/events/${id}`),

  // ─── RSVP ─────────────────────────────────────────────────────────────────

  updateRsvp: (eventId: string, rsvp_status: 'going' | 'maybe' | 'not_going'): Promise<EventMember> =>
    request('PATCH', `/events/${eventId}/rsvp`, { rsvp_status }),

  // ─── Push token ───────────────────────────────────────────────────────────

  savePushToken: (token: string): Promise<{ ok: boolean }> =>
    request('PATCH', '/users/push-token', { token }),

  // ─── Activity feed ────────────────────────────────────────────────────────

  getActivity: (eventId: string, offset = 0): Promise<ActivityItem[]> =>
    request('GET', `/events/${eventId}/activity?limit=30&offset=${offset}`),

  // ─── Comments ─────────────────────────────────────────────────────────────

  getComments: (itemId: string): Promise<ItemComment[]> =>
    request('GET', `/items/${itemId}/comments`),

  addComment: (itemId: string, text: string): Promise<ItemComment> =>
    request('POST', `/items/${itemId}/comments`, { text }),
};
