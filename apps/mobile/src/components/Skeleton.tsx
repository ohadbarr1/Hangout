import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Base SkeletonBox
// ---------------------------------------------------------------------------

interface SkeletonBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: '#E8E8F0',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// EventCardSkeleton — mimics the EventCard layout
// ---------------------------------------------------------------------------

export function EventCardSkeleton() {
  return (
    <View style={styles.eventCard}>
      {/* Top row: color dot + title */}
      <View style={styles.row}>
        <SkeletonBox width={10} height={10} borderRadius={5} style={styles.dot} />
        <SkeletonBox width="60%" height={14} borderRadius={6} />
      </View>
      {/* Date line */}
      <SkeletonBox width="40%" height={12} borderRadius={5} style={styles.mt8} />
      {/* Progress bar */}
      <SkeletonBox width="100%" height={6} borderRadius={3} style={styles.mt12} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// NextHangoutCardSkeleton — tall hero card
// ---------------------------------------------------------------------------

export function NextHangoutCardSkeleton() {
  return (
    <View style={styles.heroCard}>
      {/* Title */}
      <SkeletonBox width="70%" height={22} borderRadius={8} />
      {/* Date */}
      <SkeletonBox width="45%" height={14} borderRadius={6} style={styles.mt12} />
      {/* Progress */}
      <View style={[styles.row, styles.mt20]}>
        <SkeletonBox width="30%" height={12} borderRadius={5} />
        <SkeletonBox width="15%" height={12} borderRadius={5} />
      </View>
      <SkeletonBox width="100%" height={6} borderRadius={3} style={styles.mt8} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ItemCardSkeleton — single item row
// ---------------------------------------------------------------------------

export function ItemCardSkeleton() {
  return (
    <View style={styles.itemCard}>
      {/* Left checkbox area */}
      <SkeletonBox width={40} height={40} borderRadius={12} />
      {/* Text block */}
      <View style={styles.itemTextBlock}>
        <SkeletonBox width="55%" height={13} borderRadius={5} />
        <SkeletonBox width="35%" height={11} borderRadius={5} style={styles.mt6} />
      </View>
      {/* Right badge */}
      <SkeletonBox width={64} height={28} borderRadius={14} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// EventDetailHeroSkeleton — mimics the hero section of the event detail
// ---------------------------------------------------------------------------

export function EventDetailHeroSkeleton() {
  return (
    <View style={styles.detailHero}>
      {/* Back button row */}
      <SkeletonBox width={40} height={40} borderRadius={20} style={styles.mb24} />
      {/* Title */}
      <SkeletonBox width="75%" height={28} borderRadius={10} />
      <SkeletonBox width="50%" height={18} borderRadius={8} style={styles.mt12} />
      {/* Badges row */}
      <View style={[styles.row, styles.mt16]}>
        <SkeletonBox width={110} height={28} borderRadius={14} />
        <SkeletonBox width={90} height={28} borderRadius={14} />
      </View>
      {/* Progress block */}
      <View style={[styles.progressBlock, styles.mt20]}>
        <View style={styles.row}>
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <View style={styles.itemTextBlock}>
            <SkeletonBox width={60} height={18} borderRadius={6} />
            <SkeletonBox width={80} height={12} borderRadius={5} style={styles.mt6} />
          </View>
        </View>
        {/* Avatar row */}
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <SkeletonBox
              key={i}
              width={32}
              height={32}
              borderRadius={16}
              style={{ marginLeft: i === 0 ? 0 : -8 }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dot: {
    flexShrink: 0,
  },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mb24: { marginBottom: 24 },

  // EventCard container
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },

  // Hero card container
  heroCard: {
    backgroundColor: '#E8E8F0',
    borderRadius: 24,
    padding: 20,
    minHeight: 140,
  },

  // ItemCard container
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTextBlock: {
    flex: 1,
  },

  // EventDetail hero
  detailHero: {
    backgroundColor: '#E8E8F0',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  progressBlock: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
