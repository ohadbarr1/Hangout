import React from 'react';
import { useT } from '@/i18n';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { useMyEventsWithCounts } from '@/hooks/useEvent';
import type { EventWithCounts } from '@/hooks/useEvent';
import { formatDate } from '@/utils/dateUtils';
import {
  EventCardSkeleton,
  NextHangoutCardSkeleton,
} from '@/components/Skeleton';
import { useSpringPress } from '@/hooks/useSpringPress';
import { useFadeInUp } from '@/hooks/useFadeInUp';

const { width: SW } = Dimensions.get('window');
const CARD_GAP = 12;
const GRID_CARD_W = (SW - 20 * 2 - CARD_GAP) / 2;

const HERO_GRADIENTS: Record<string, [string, string]> = {
  coral:    ['#FF6B4A', '#FF9472'],
  violet:   ['#7B61FF', '#9985FF'],
  mint:     ['#06D6A0', '#34E8B7'],
  golden:   ['#FFD166', '#FFC233'],
  charcoal: ['#2E2E50', '#44446A'],
};

const HERO_COLORS: Record<string, string> = {
  coral: '#FF6B4A', violet: '#7B61FF', mint: '#06D6A0', golden: '#FFD166', charcoal: '#2E2E50',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: events, isLoading, isRefetching, refetch } = useMyEventsWithCounts();

  const { t, isRTL } = useT();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const allEvents = events ?? [];

  const activeEvents = allEvents.filter(
    (e) => e.status === 'active' || e.status === 'draft',
  );

  // Hero: the soonest upcoming active event
  const heroEvent: EventWithCounts | null = activeEvents.length > 0
    ? activeEvents.slice().sort((a, b) => {
        if (a.event_date && b.event_date)
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        if (a.event_date) return -1;
        if (b.event_date) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0]
    : null;

  // Grid: everything else, most-recently-created first, capped at 6
  const gridEvents = allEvents
    .filter((e) => e.id !== heroEvent?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <View
      className="flex-1 bg-warmwhite dark:bg-charcoal-800"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text
            className="text-charcoal/50 dark:text-white/40 text-xs"
            style={{ fontFamily: 'Inter-Regular', textAlign: isRTL ? 'right' : 'left' }}
          >
            {t(`greeting_${getGreeting()}` as any).toUpperCase()}
          </Text>
          <Text
            className="text-charcoal dark:text-white text-2xl"
            style={{ fontFamily: 'PlusJakartaSans-Bold', textAlign: isRTL ? 'right' : 'left' }}
          >
            {t('greeting_hey', { name: firstName })}
          </Text>
        </View>

        <NewEventButton label={t('home_new_event')} onPress={() => router.push('/event/create')} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
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
          <LoadingSkeleton />
        ) : allEvents.length === 0 ? (
          <EmptyState
            onCreatePress={(example?: string) =>
              router.push({ pathname: '/event/create', params: example ? { prefill: example } : {} })
            }
          />
        ) : (
          <BentoLayout
            heroEvent={heroEvent}
            gridEvents={gridEvents}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Bento Layout ────────────────────────────────────────────────────────────

function BentoLayout({
  heroEvent,
  gridEvents,
}: {
  heroEvent: EventWithCounts | null;
  gridEvents: EventWithCounts[];
}) {
  const { t } = useT();
  return (
    <View style={styles.bento}>
      {/* Hero card — full width */}
      {heroEvent && (
        <FadeRow index={0}>
          <HeroCard
            event={heroEvent}
            onPress={() => router.push(`/event/${heroEvent.id}`)}
          />
        </FadeRow>
      )}

      {/* Grid — 2 columns */}
      {gridEvents.length > 0 && (
        <>
          <FadeRow index={1}>
            <Text
              className="text-charcoal/50 dark:text-white/40 text-xs mt-6 mb-3"
              style={{ fontFamily: 'Inter-Medium', letterSpacing: 0.8 }}
            >
              {t('home_all_hangouts')}
            </Text>
          </FadeRow>
          <View style={styles.grid}>
            {gridEvents.map((event, i) => (
              <FadeRow key={event.id} index={i + 2}>
                <GridCard
                  event={event}
                  onPress={() => router.push(`/event/${event.id}`)}
                />
              </FadeRow>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────

function HeroCard({ event, onPress }: { event: EventWithCounts; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.975 });
  const { t } = useT();
  const gradient = HERO_GRADIENTS[event.hero_color] ?? HERO_GRADIENTS.coral;
  const progressPercent =
    event.totalItems > 0 ? Math.round((event.claimedCount / event.totalItems) * 100) : 0;

  const isAllClaimed = event.totalItems > 0 && event.claimedCount === event.totalItems;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Status pill */}
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              {event.status === 'active' ? '● Active' : '◌ Draft'}
            </Text>
          </View>

          <Text style={styles.heroTitle} numberOfLines={2}>
            {event.title}
          </Text>

          {event.event_date && (
            <View style={styles.heroMetaRow}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={styles.heroDate}>{formatDate(event.event_date)}</Text>
            </View>
          )}
          {event.location && (
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={styles.heroLocation} numberOfLines={1}>{event.location}</Text>
            </View>
          )}

          {/* Progress */}
          {event.totalItems > 0 && (
            <View style={styles.heroProgressRow}>
              <View style={styles.heroProgressBar}>
                <View
                  style={[
                    styles.heroProgressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.heroProgressLabel}>
                {isAllClaimed
                  ? t('card_all_claimed')
                  : t('card_claimed', { claimed: event.claimedCount, total: event.totalItems })}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({ event, onPress }: { event: EventWithCounts; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.94 });
  const { t } = useT();
  const accent = HERO_COLORS[event.hero_color] ?? HERO_COLORS.coral;
  const isActive = event.status === 'active';

  return (
    <Animated.View style={[animatedStyle, { width: GRID_CARD_W }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.gridCard}
      >
        {/* Left accent */}
        <View style={[styles.gridAccent, { backgroundColor: accent }]} />

        <View style={styles.gridBody}>
          {/* Status */}
          <View style={styles.gridStatusRow}>
            <View style={[styles.gridDot, { backgroundColor: isActive ? '#06D6A0' : 'rgba(26,26,46,0.18)' }]} />
            <Text style={styles.gridStatus}>
              {event.status === 'active' ? t('status_active') : event.status === 'draft' ? t('status_draft') : event.status === 'completed' ? t('status_completed') : t('status_cancelled')}
            </Text>
          </View>

          <Text style={styles.gridTitle} numberOfLines={2}>{event.title}</Text>

          {event.event_date && (
            <View style={styles.gridDateRow}>
              <Ionicons name="calendar-outline" size={10} color="#C8C8D8" />
              <Text style={styles.gridDate}>{formatDate(event.event_date)}</Text>
            </View>
          )}

          {event.totalItems > 0 && (
            <View style={[styles.gridFraction, { backgroundColor: accent + '18' }]}>
              <Text style={[styles.gridFractionText, { color: accent }]}>
                {event.claimedCount}/{event.totalItems}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FadeRow({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useFadeInUp({ delay: index * 70 });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function NewEventButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.92 });
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.newEventBtn}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.newEventLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ paddingTop: 16, gap: 20 }}>
      <NextHangoutCardSkeleton />
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        <EventCardSkeleton />
        <EventCardSkeleton />
      </View>
    </View>
  );
}

function EmptyState({ onCreatePress }: { onCreatePress: (example?: string) => void }) {
  const { t } = useT();
  const examples = [
    t('home_example_1'),
    t('home_example_2'),
    t('home_example_3'),
  ];

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyTitle}>{t('home_empty_title')}</Text>
      <Text style={styles.emptySub}>{t('home_empty_sub')}</Text>

      <Text style={styles.exampleLabel}>{t('home_try_example')}</Text>
      <View style={{ width: '100%', gap: 8, marginBottom: 32 }}>
        {examples.map((ex) => (
          <TouchableOpacity
            key={ex}
            onPress={() => onCreatePress(ex)}
            style={styles.exampleChip}
            activeOpacity={0.75}
          >
            <Text style={styles.exampleText}>{ex}</Text>
            <Ionicons name="arrow-forward-circle-outline" size={18} color="#FF6B4A" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => onCreatePress()}
        style={styles.emptyBtn}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyBtnLabel}>{t('home_plan_btn')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 8,
  },
  bento: {
    gap: 0,
  },

  // Hero
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  heroPillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 6,
    lineHeight: 32,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  heroLocation: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    flex: 1,
    marginBottom: 0,
  },
  heroProgressRow: {
    gap: 8,
    marginTop: 14,
  },
  heroProgressBar: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 100,
  },
  heroProgressLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  gridAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  gridBody: {
    padding: 14,
    paddingLeft: 17,
    gap: 5,
  },
  gridStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gridDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridStatus: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#B0B0C8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  gridTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#1A1A2E',
    lineHeight: 19,
  },
  gridDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridDate: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#B0B0C8',
  },
  gridFraction: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  gridFractionText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },

  // New Event Button
  newEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B4A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  newEventLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(26,26,46,0.55)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  exampleLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(26,26,46,0.4)',
    marginBottom: 12,
    alignSelf: 'flex-start',
    letterSpacing: 0.8,
  },
  exampleChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(26,26,46,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  exampleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(26,26,46,0.7)',
    flex: 1,
  },
  emptyBtn: {
    backgroundColor: '#FF6B4A',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  emptyBtnLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
