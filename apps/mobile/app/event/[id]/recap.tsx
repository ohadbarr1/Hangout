import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { apiClient } from '@/lib/claude';
import { useFadeInUp } from '@/hooks/useFadeInUp';
import Animated from 'react-native-reanimated';
import { useT } from '@/i18n';

const HERO_GRADIENTS: Record<string, [string, string]> = {
  coral:    ['#FF6B4A', '#FF9472'],
  violet:   ['#7B61FF', '#9985FF'],
  mint:     ['#06D6A0', '#34E8B7'],
  golden:   ['#FFD166', '#FFC233'],
  charcoal: ['#2E2E50', '#44446A'],
};

export default function RecapScreen() {
  const { id, color } = useLocalSearchParams<{ id: string; color?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const { data: recap, isLoading } = useQuery({
    queryKey: ['recap', id],
    queryFn: () => apiClient.getRecap(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const gradient = HERO_GRADIENTS[color ?? 'coral'] ?? HERO_GRADIENTS.coral;
  const progressPercent = recap && recap.totalItems > 0
    ? Math.round((recap.claimedCount / recap.totalItems) * 100)
    : 0;

  const handleShare = async () => {
    if (!recap) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const text = [
      `🎉 ${recap.eventTitle} — Recap`,
      ``,
      recap.aiOneliner,
      ``,
      `👥 ${recap.attendeeCount} people attended`,
      `✅ ${recap.claimedCount}/${recap.totalItems} items claimed (${progressPercent}%)`,
      recap.topContributors.length > 0
        ? `🏆 MVP: ${recap.topContributors[0]}`
        : '',
      ``,
      `Planned with Hangout 🎊`,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message: text });
    } catch {
      // dismissed
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient header */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.heroLabel}>{t('recap_label')}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {isLoading ? '...' : recap?.eventTitle ?? ''}
          </Text>

          {/* AI one-liner */}
          {recap?.aiOneliner && (
            <Text style={styles.heroOneliner}>"{recap.aiOneliner}"</Text>
          )}
        </LinearGradient>

        {/* Stats grid */}
        <FadeRow index={0}>
          <View style={styles.statsGrid}>
            <StatCard
              icon="people"
              value={recap?.attendeeCount ?? '—'}
              label={t('recap_attended')}
              gradient={gradient}
            />
            <StatCard
              icon="checkmark-circle"
              value={recap ? `${progressPercent}%` : '—'}
              label={t('recap_items_claimed')}
              gradient={gradient}
            />
          </View>
        </FadeRow>

        {/* Top contributors */}
        {recap && recap.topContributors.length > 0 && (
          <FadeRow index={1}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('recap_top_contributors')}</Text>
              {recap.topContributors.map((name, i) => (
                <View key={name} style={styles.contributorRow}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.contributorRankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.contributorName}>{name}</Text>
                  {i === 0 && <Text style={styles.mvpBadge}>{t('recap_mvp')}</Text>}
                </View>
              ))}
            </View>
          </FadeRow>
        )}

        {/* Who came */}
        {recap && recap.members.length > 0 && (
          <FadeRow index={2}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('recap_who_came')}</Text>
              <View style={styles.memberGrid}>
                {recap.members.map((m) => (
                  <View key={m.name} style={styles.memberChip}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.name.split(' ')[0]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeRow>
        )}

        {/* Share button */}
        <FadeRow index={3}>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareBtnGradient}
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.shareBtnLabel}>{t('recap_share')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </FadeRow>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  gradient,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  gradient: [string, string];
}) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[gradient[0] + '22', gradient[1] + '11']}
        style={styles.statIconWrap}
      >
        <Ionicons name={icon} size={22} color={gradient[0]} />
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FadeRow({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useFadeInUp({ delay: index * 80 });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    lineHeight: 34,
    marginBottom: 14,
  },
  heroOneliner: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9999B8',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#1A1A2E',
    marginBottom: 14,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,26,46,0.05)',
  },
  contributorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26,26,46,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributorRankText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#44446A',
  },
  contributorName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1A1A2E',
  },
  mvpBadge: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B4A',
    backgroundColor: '#FFF1EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FF6B4A',
  },
  memberName: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9999B8',
    textAlign: 'center',
  },
  shareBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 18,
    overflow: 'hidden',
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  shareBtnLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
