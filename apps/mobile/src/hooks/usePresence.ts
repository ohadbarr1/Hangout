import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: number;
}

/**
 * Tracks who is currently viewing an event using Supabase Realtime Presence.
 * Joins the channel on mount, leaves on unmount.
 */
export function usePresence(eventId: string | undefined, currentUser: { id: string; name: string; avatar_url?: string | null } | null) {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!eventId || !currentUser) return;

    const channel = supabase.channel(`presence:event:${eventId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string; avatarUrl: string | null; joinedAt: number }>();
        const users: PresenceUser[] = Object.entries(state).map(([userId, presences]) => {
          const p = presences[0]!;
          return {
            userId,
            name: p.name,
            avatarUrl: p.avatarUrl,
            joinedAt: p.joinedAt,
          };
        });
        setViewers(users.sort((a, b) => a.joinedAt - b.joinedAt));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: currentUser.name,
            avatarUrl: currentUser.avatar_url ?? null,
            joinedAt: Date.now(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [eventId, currentUser?.id]);

  // Exclude self from displayed viewers
  const others = viewers.filter((v) => v.userId !== currentUser?.id);

  return { viewers: others, total: viewers.length };
}
