import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@hangout/shared';
import { formatDate } from '@/utils/dateUtils';
import { useSpringPress } from '@/hooks/useSpringPress';
import { useT } from '@/i18n';

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
  claimedCount?: number;
  totalItems?: number;
  attendeeAvatars?: Array<{ id: string; name: string; avatar_url: string | null }>;
}

export const EventCard = React.memo(function EventCard({
  event,
  onPress,
  muted = false,
  claimedCount = 0,
  totalItems = 0,
  attendeeAvatars = [],
}: EventCardProps) {
  const accent = HERO_COLORS[event.hero_color] ?? HERO_COLORS.coral;
  const progressPercent = totalItems > 0 ? Math.round((claimedCount / totalItems) * 100) : 0;
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.97 });
  const { t } = useT();

  return (
    <Animated.View style={[animatedStyle, muted && { opacity: 0.55 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.card}
      >
        {/* Left accent bar */}
        <View style={[styles.accent, { backgroundColor: accent }]} />

        <View style={styles.body}>
          {/* Title + status badge */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            <StatusBadge status={event.status} t={t} />
          </View>

          {/* Date + location */}
          {(event.event_date || event.location) && (
            <View style={styles.metaRow}>
              {event.event_date && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#B8B8D0" />
                  <Text style={styles.metaText}>{formatDate(event.event_date)}</Text>
                </View>
              )}
              {event.location && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color="#B8B8D0" />
                  <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
                </View>
              )}
            </View>
          )}

          {/* Progress + avatars */}
          <View style={styles.footer}>
            {totalItems > 0 ? (
              <View style={styles.progressWrapper}>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>
                    {t('card_claimed', { claimed: claimedCount, total: totalItems })}
                  </Text>
                  <Text style={[styles.progressPct, { color: accent }]}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` as any, backgroundColor: accent }]} />
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {attendeeAvatars.length > 0 && (
              <MiniAvatarGroup users={attendeeAvatars} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

function StatusBadge({ status, t }: { status: Event['status']; t: (k: any, vars?: any) => string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    draft:     { label: t('status_draft'),     bg: '#F2F2F8', text: '#6E6E9A' },
    active:    { label: t('status_active'),    bg: '#EDFAF4', text: '#028F69' },
    completed: { label: t('status_completed'), bg: '#F2F2F8', text: '#9999B8' },
    cancelled: { label: t('status_cancelled'), bg: '#FFF1EE', text: '#C43A1C' },
  };
  const c = config[status] ?? config.draft;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
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
    <View style={styles.avatars}>
      {visible.map((u, i) => (
        <View
          key={u.id}
          style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0 }]}
        >
          <Text style={styles.avatarInitial}>{u.name.charAt(0).toUpperCase()}</Text>
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.avatar, styles.avatarOverflow, { marginLeft: -8 }]}>
          <Text style={styles.avatarOverflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  accent: {
    width: 4,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#1A1A2E',
    lineHeight: 22,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#B8B8D0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  progressWrapper: {
    flex: 1,
    gap: 5,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#B8B8D0',
  },
  progressPct: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(26,26,46,0.07)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },
  avatars: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,107,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarInitial: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FF6B4A',
  },
  avatarOverflow: {
    backgroundColor: 'rgba(26,26,46,0.08)',
  },
  avatarOverflowText: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: '#9999B8',
  },
});
