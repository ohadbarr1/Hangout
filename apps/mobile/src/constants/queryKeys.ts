export const queryKeys = {
  events: () => ['events'] as const,
  eventsWithCounts: () => ['events-with-counts'] as const,
  event: (id: string) => ['event', id] as const,
  items: (eventId: string) => ['items', eventId] as const,
  members: (eventId: string) => ['event-members', eventId] as const,
};
