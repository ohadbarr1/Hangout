import { View, Text, TouchableOpacity } from 'react-native';
import type { Event } from '@hangout/shared';

const HERO_COLORS: Record<string, string> = {
  coral: '#FF6B4A',
  violet: '#7B61FF',
  mint: '#06D6A0',
  golden: '#FFD166',
  charcoal: '#2E2E50',
};

interface EventCardProps {
  event: Event;
  onPress: () => void;
  muted?: boolean;
  // Optional progress data (pre-fetched or passed from parent)
  claimedCount?: number;
  totalItems?: number;
  attendeeAvatars?: Array<{ id: string; name: string; avatar_url: string | null }>;
}

export function EventCard({
  event,
  onPress,
  muted = false,
  claimedCount = 0,
  totalItems = 0,
  attendeeAvatars = [],
}: EventCardProps) {
  const accentColor = HERO_COLORS[event.hero_color] ?? HERO_COLORS.coral;
  const progressPercent = totalItems > 0 ? Math.round((claimedCount / totalItems) * 100) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className={`bg-white rounded-3xl overflow-hidden shadow-sm shadow-charcoal/5 ${muted ? 'opacity-60' : ''}`}
    >
      {/* Color strip */}
      <View
        style={{ backgroundColor: accentColor, height: 6 }}
      />

      <View className="p-4">
        {/* Title + status */}
        <View className="flex-row items-start justify-between mb-2">
          <Text
            className="text-charcoal text-base flex-1 mr-2"
            style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <StatusBadge status={event.status} />
        </View>

        {/* Date + location */}
        <View className="flex-row flex-wrap gap-3 mb-4">
          {event.event_date && (
            <Text
              className="text-charcoal/50 text-xs"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              📅 {formatDate(event.event_date)}
            </Text>
          )}
          {event.location && (
            <Text
              className="text-charcoal/50 text-xs"
              style={{ fontFamily: 'Inter-Regular' }}
              numberOfLines={1}
            >
              📍 {event.location}
            </Text>
          )}
        </View>

        {/* Progress + avatars */}
        <View className="flex-row items-center justify-between">
          {totalItems > 0 ? (
            <View className="flex-1 mr-4">
              <View className="flex-row justify-between mb-1.5">
                <Text
                  className="text-charcoal/50 text-xs"
                  style={{ fontFamily: 'Inter-Regular' }}
                >
                  {claimedCount}/{totalItems} claimed
                </Text>
                <Text
                  className="text-xs"
                  style={{ fontFamily: 'Inter-Medium', color: accentColor }}
                >
                  {progressPercent}%
                </Text>
              </View>
              {/* Progress bar */}
              <View className="h-1.5 bg-charcoal/8 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: accentColor,
                    width: `${progressPercent}%`,
                  }}
                />
              </View>
            </View>
          ) : (
            <View className="flex-1" />
          )}

          {attendeeAvatars.length > 0 && (
            <MiniAvatarGroup users={attendeeAvatars} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatusBadge({ status }: { status: Event['status'] }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: '#F5F5F9', text: '#44446A' },
    active: { label: 'Active', bg: '#EDFDF8', text: '#028F69' },
    completed: { label: 'Done', bg: '#F5F5F9', text: '#9999B8' },
    cancelled: { label: 'Cancelled', bg: '#FFF1EE', text: '#C43A1C' },
  };
  const c = config[status] ?? config.draft;
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: c.bg }}
    >
      <Text
        className="text-xs"
        style={{ fontFamily: 'Inter-Medium', color: c.text }}
      >
        {c.label}
      </Text>
    </View>
  );
}

function MiniAvatarGroup({
  users,
}: {
  users: Array<{ id: string; name: string; avatar_url: string | null }>;
}) {
  const visible = users.slice(0, 3);
  const overflow = users.length - visible.length;

  return (
    <View className="flex-row">
      {visible.map((u, i) => (
        <View
          key={u.id}
          className="w-7 h-7 rounded-full bg-primary/15 items-center justify-center border-2 border-white"
          style={{ marginLeft: i > 0 ? -8 : 0 }}
        >
          <Text
            className="text-primary text-xs"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            {u.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {overflow > 0 && (
        <View
          className="w-7 h-7 rounded-full bg-charcoal/10 items-center justify-center border-2 border-white"
          style={{ marginLeft: -8 }}
        >
          <Text
            className="text-charcoal/60 text-xs"
            style={{ fontFamily: 'Inter-Medium' }}
          >
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff <= 6) return `In ${diff} days`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
