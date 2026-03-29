import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/claude';
import type { Item } from '@hangout/shared';

/**
 * Hook that fetches items for an event and subscribes to real-time
 * changes on both the items and assignments tables.
 */
export function useItems(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery<Item[]>({
    queryKey: ['items', eventId],
    queryFn: () => {
      if (!eventId) throw new Error('eventId required');
      return apiClient.getItems(eventId);
    },
    enabled: !!eventId,
    staleTime: 15_000,
  });

  // Derive the loaded item IDs so we can filter the assignments subscription
  const itemIds = query.data?.map((item) => item.id) ?? [];

  // Real-time: items table changes
  useEffect(() => {
    if (!eventId) return;

    const itemsChannel = supabase
      .channel(`items:event_id=eq.${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          queryClient.setQueryData<Item[]>(['items', eventId], (old = []) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...old, payload.new as Item];
              case 'UPDATE':
                return old.map((item) =>
                  item.id === (payload.new as Item).id
                    ? { ...item, ...(payload.new as Partial<Item>) }
                    : item,
                );
              case 'DELETE':
                return old.filter((item) => item.id !== (payload.old as Partial<Item>).id);
              default:
                return old;
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, [eventId, queryClient]);

  // Real-time: assignments changes (claim/unclaim), filtered to this event's items
  useEffect(() => {
    if (!eventId || itemIds.length === 0) return;

    // Filter by item_id so only assignment changes for this event's items trigger a refetch
    const assignmentsChannel = supabase
      .channel(`assignments:event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `item_id=in.(${itemIds.join(',')})`,
        },
        () => {
          // Invalidate and refetch items so assignment join is fresh
          queryClient.invalidateQueries({ queryKey: ['items', eventId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, queryClient, itemIds.join(',')]);

  return query;
}
