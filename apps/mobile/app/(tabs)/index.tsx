import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { useMyEventsWithCounts } from '@/hooks/useEvent';
import type { EventWithCounts } from '@/hooks/useEvent';
import { EventCard } from '@/components/EventCard';

const HERO_COLORS: Record<string, string> = {
  coral: '#FF6B4A',
  violet: '#7B61FF',
  mint: '#06D6A0',
  golden: '#FFD166',
  charcoal: '#2E2E50',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: events, isLoading, isRefetching, refetch } = useMyEventsWithCounts();

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const allEvents = events ?? [];

  // --- Next hangout: upcoming active/draft events sorted by event_date, fallback to created_at ---
  const activeEvents = allEvents.filter(
    (e) => e.status === 'active' || e.status === 'draft',
  );

  const nextHangout: EventWithCounts | null = activeEvents.length > 0
    ? activeEvents.slice().sort((a, b) => {
        if (a.event_date && b.event_date) {
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        }
        if (a.event_date) return -1;
        if (b.event_date) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0]
    : null;

  // --- Needs attention: unclaimed items, max 3, excluding the nextHangout ---
  const needsAttention = allEvents
    .filter(
      (e) =>
        e.claimedCount < e.totalItems &&
        e.totalItems > 0 &&
        e.id !== nextHangout?.id,
    )
    .slice(0, 3);

  // --- Recently active: last 2-3 by created_at desc, excluding nextHangout and needsAttention ---
  const attentionIds = new Set(needsAttention.map((e) => e.id));
  const recentlyActive = allEvents
    .filter((e) => e.id !== nextHangout?.id && !attentionIds.has(e.id))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  return (
    <View
      className="flex-1 bg-warmwhite"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text
            className="text-charcoal/60 text-sm"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            Good {getGreeting()}
          </Text>
          <Text
            className="text-charcoal text-2xl"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            Hey, {firstName} 👋
          </Text>
        </View>

        {/* New event FAB */}
        <TouchableOpacity
          onPress={() => router.push('/event/create')}
          className="flex-row items-center bg-primary rounded-2xl px-4 py-3 gap-1.5"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text
            className="text-white text-sm"
            style={{ fontFamily: 'Inter-SemiBold' }}
          >
            New event
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FF6B4A"
          />
        }
      >
        {isLoading ? (
          <View className="items-center justify-center pt-20">
            <ActivityIndicator color="#FF6B4A" size="large" />
          </View>
        ) : allEvents.length === 0 ? (
          <EmptyState onCreatePress={() => router.push('/event/create')} />
        ) : (
          <>
            {/* Your next hangout */}
            {nextHangout && (
              <View className="mt-6">
                <Text
                  className="text-charcoal text-lg mb-3"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                >
                  Your next hangout
                </Text>
                <NextHangoutCard
                  event={nextHangout}
                  onPress={() => router.push(`/event/${nextHangout.id}`)}
                />
              </View>
            )}

            {/* Needs your attention */}
            {needsAttention.length > 0 && (
              <View className="mt-8">
                <Text
                  className="text-charcoal text-lg mb-3"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                >
                  Needs your attention
                </Text>
                <View className="gap-3">
                  {needsAttention.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/event/${event.id}`)}
                      claimedCount={event.claimedCount}
                      totalItems={event.totalItems}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Recently active */}
            {recentlyActive.length > 0 && (
              <View className="mt-8">
                <Text
                  className="text-charcoal text-lg mb-3"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                >
                  Recently active
                </Text>
                <View className="gap-3">
                  {recentlyActive.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/event/${event.id}`)}
                      claimedCount={event.claimedCount}
                      totalItems={event.totalItems}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function NextHangoutCard({
  event,
  onPress,
}: {
  event: EventWithCounts;
  onPress: () => void;
}) {
  const accentColor = HERO_COLORS[event.hero_color] ?? HERO_COLORS.coral;
  const progressPercent =
    event.totalItems > 0
      ? Math.round((event.claimedCount / event.totalItems) * 100)
      : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className="rounded-3xl overflow-hidden shadow-sm shadow-charcoal/5"
      style={{ backgroundColor: accentColor }}
    >
      <View className="p-5">
        <Text
          className="text-white text-xl mb-1"
          style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          numberOfLines={2}
        >
          {event.title}
        </Text>

        {event.event_date && (
          <Text
            className="text-white/80 text-sm mb-4"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            📅 {formatDate(event.event_date)}
          </Text>
        )}

        {event.totalItems > 0 && (
          <View>
            <View className="flex-row justify-between mb-1.5">
              <Text
                className="text-white/70 text-xs"
                style={{ fontFamily: 'Inter-Regular' }}
              >
                {event.claimedCount}/{event.totalItems} items claimed
              </Text>
              <Text
                className="text-white text-xs"
                style={{ fontFamily: 'Inter-Medium' }}
              >
                {progressPercent}%
              </Text>
            </View>
            <View className="h-1.5 bg-white/30 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View className="items-center justify-center pt-20 px-8">
      <Text className="text-5xl mb-6">🎉</Text>
      <Text
        className="text-charcoal text-xl text-center mb-3"
        style={{ fontFamily: 'PlusJakartaSans-Bold' }}
      >
        No hangouts yet
      </Text>
      <Text
        className="text-charcoal/60 text-base text-center mb-8 leading-6"
        style={{ fontFamily: 'Inter-Regular' }}
      >
        Describe your first event and let AI plan everything — what to bring, who brings what.
      </Text>
      <TouchableOpacity
        onPress={onCreatePress}
        className="bg-primary rounded-2xl px-8 py-4"
        activeOpacity={0.85}
      >
        <Text
          className="text-white text-base"
          style={{ fontFamily: 'Inter-SemiBold' }}
        >
          Plan a hangout
        </Text>
      </TouchableOpacity>
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
