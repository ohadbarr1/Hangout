import { create } from 'zustand';
import type { Event } from '@hangout/shared';

interface EventState {
  // Local cache of events (populated by React Query, mirrored here for cross-screen access)
  events: Record<string, Event>;
  // Optimistic item states keyed by item id
  optimisticClaims: Record<string, { userId: string; userName: string; avatarUrl: string | null } | null>;

  setEvent: (event: Event) => void;
  setEvents: (events: Event[]) => void;
  removeEvent: (eventId: string) => void;

  // Optimistic claim tracking — used while mutation is in-flight
  setOptimisticClaim: (
    itemId: string,
    claim: { userId: string; userName: string; avatarUrl: string | null } | null,
  ) => void;
  clearOptimisticClaim: (itemId: string) => void;
  clearAllOptimisticClaims: () => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: {},
  optimisticClaims: {},

  setEvent: (event) =>
    set((state) => ({
      events: { ...state.events, [event.id]: event },
    })),

  setEvents: (events) =>
    set({
      events: events.reduce<Record<string, Event>>((acc, e) => {
        acc[e.id] = e;
        return acc;
      }, {}),
    }),

  removeEvent: (eventId) =>
    set((state) => {
      const next = { ...state.events };
      delete next[eventId];
      return { events: next };
    }),

  setOptimisticClaim: (itemId, claim) =>
    set((state) => ({
      optimisticClaims: { ...state.optimisticClaims, [itemId]: claim },
    })),

  clearOptimisticClaim: (itemId) =>
    set((state) => {
      const next = { ...state.optimisticClaims };
      delete next[itemId];
      return { optimisticClaims: next };
    }),

  clearAllOptimisticClaims: () => set({ optimisticClaims: {} }),
}));
