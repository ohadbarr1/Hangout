import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/claude';
import type { Event, EventMember } from '@hangout/shared';

// ─── Augmented event type that includes item progress counts ──────────────────

export interface EventWithCounts extends Event {
  claimedCount: number;
  totalItems: number;
}

// ─── Fetch all events for the current user ────────────────────────────────────

export function useMyEvents() {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => apiClient.getMyEvents(),
    staleTime: 5 * 60_000,
  });
}

// ─── Fetch events with item progress counts (for EventCard progress bars) ─────

export function useMyEventsWithCounts() {
  return useQuery<EventWithCounts[]>({
    queryKey: ['events-with-counts'],
    queryFn: async () => {
      // Fetch events from API (handles auth + membership filtering)
      const events = await apiClient.getMyEvents();
      if (events.length === 0) return [];

      const eventIds = events.map((e) => e.id);

      // Fetch all items for these events in one Supabase query
      const { data: items } = await supabase
        .from('items')
        .select('id, event_id, assignments(id)')
        .in('event_id', eventIds);

      // Build a per-event count map
      const countMap: Record<string, { total: number; claimed: number }> = {};
      for (const item of items ?? []) {
        if (!countMap[item.event_id]) {
          countMap[item.event_id] = { total: 0, claimed: 0 };
        }
        countMap[item.event_id].total += 1;
        const assignmentsArr = Array.isArray(item.assignments) ? item.assignments : [];
        if (assignmentsArr.length > 0) {
          countMap[item.event_id].claimed += 1;
        }
      }

      return events.map((event) => ({
        ...event,
        totalItems: countMap[event.id]?.total ?? 0,
        claimedCount: countMap[event.id]?.claimed ?? 0,
      }));
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Fetch a single event + subscribe to real-time updates ───────────────────

export function useEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: () => {
      if (!eventId) throw new Error('eventId required');
      return apiClient.getEvent(eventId);
    },
    enabled: !!eventId,
    staleTime: 20_000,
  });

  // Supabase Realtime subscription for this event row
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Merge realtime update into React Query cache
            queryClient.setQueryData<Event>(['event', eventId], (old) =>
              old ? { ...old, ...(payload.new as Partial<Event>) } : (payload.new as Event),
            );
          } else if (payload.eventType === 'DELETE') {
            queryClient.removeQueries({ queryKey: ['event', eventId] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return query;
}

// ─── Fetch event members ──────────────────────────────────────────────────────

export function useEventMembers(eventId: string | undefined) {
  return useQuery<EventMember[]>({
    queryKey: ['event-members', eventId],
    queryFn: () => {
      if (!eventId) throw new Error('eventId required');
      return apiClient.getEventMembers(eventId);
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });
}
