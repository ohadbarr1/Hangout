import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/claude';
import type { Event, EventMember } from '@hangout/shared';

// ─── Fetch all events for the current user ────────────────────────────────────

export function useMyEvents() {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => apiClient.getMyEvents(),
    staleTime: 30_000,
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
