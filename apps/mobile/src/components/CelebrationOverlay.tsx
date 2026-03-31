import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';
import { buildParticles } from '@/hooks/useCelebration';
import type { Particle } from '@/hooks/useCelebration';
import { useT } from '@/i18n';

const { width: SW, height: SH } = Dimensions.get('window');
const GRAVITY = 500; // px/s² downward
const DURATION = 2400; // ms per particle flight

interface CelebrationOverlayProps {
  /** Animated shared value — 1 = show, 0 = hidden */
  visible: SharedValue<number>;
  onDismiss?: () => void;
  message?: string;
}

export function CelebrationOverlay({
  visible,
  onDismiss,
  message,
}: CelebrationOverlayProps) {
  const { t } = useT();
  const resolvedMessage = message ?? t('celebration_message');
  const particles = useMemo(() => buildParticles(55), []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(visible.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    pointerEvents: visible.value > 0 ? 'auto' : 'none',
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, containerStyle]}>
      {/* Particles */}
      {particles.map((p) => (
        <ParticleView key={p.id} particle={p} visible={visible} />
      ))}

      {/* Banner */}
      <BannerView message={resolvedMessage} dismissLabel={t('celebration_dismiss')} visible={visible} onDismiss={onDismiss} />
    </Animated.View>
  );
}

// ─── Particle ────────────────────────────────────────────────────────────────

function ParticleView({
  particle,
  visible,
}: {
  particle: Particle;
  visible: SharedValue<number>;
}) {
  const progress = useSharedValue(0);

  useAnimatedReaction(
    () => visible.value,
    (val, prev) => {
      if (val === 1 && (prev === 0 || prev === null)) {
        progress.value = 0;
        progress.value = withDelay(
          particle.delay,
          withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }),
        );
      }
      if (val === 0) {
        progress.value = 0;
      }
    },
  );

  const startX = particle.x * SW;

  const style = useAnimatedStyle(() => {
    const t = progress.value * (DURATION / 1000); // seconds elapsed
    const x = startX + particle.vx * t;
    // y = vy*t + 0.5*g*t²  (vy negative = upward)
    const y = SH * 0.35 + particle.vy * t + 0.5 * GRAVITY * t * t;
    const rotate = particle.spin * t;
    const opacity = interpolate(
      progress.value,
      [0, 0.05, 0.7, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: x - particle.size / 2 },
        { translateY: y },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        style,
        {
          width: particle.shape === 'strip' ? particle.size * 0.4 : particle.size,
          height: particle.shape === 'strip' ? particle.size * 2.5 : particle.size,
          borderRadius: particle.shape === 'circle' ? particle.size / 2 : 2,
          backgroundColor: particle.color,
        },
      ]}
    />
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function BannerView({
  message,
  dismissLabel,
  visible,
  onDismiss,
}: {
  message: string;
  dismissLabel: string;
  visible: SharedValue<number>;
  onDismiss?: () => void;
}) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useAnimatedReaction(
    () => visible.value,
    (val, prev) => {
      if (val === 1 && (prev === 0 || prev === null)) {
        scale.value = withDelay(
          200,
          withSequence(
            withSpring(1.1, { damping: 10, stiffness: 300 }),
            withSpring(1, { damping: 14, stiffness: 200 }),
          ),
        );
        opacity.value = withDelay(200, withTiming(1, { duration: 250 }));
      }
      if (val === 0) {
        scale.value = 0.4;
        opacity.value = 0;
      }
    },
  );

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.bannerWrapper, bannerStyle]}>
      <TouchableOpacity
        onPress={onDismiss}
        activeOpacity={0.9}
        style={styles.banner}
      >
        <Text style={styles.bannerText}>{message}</Text>
        <Text style={styles.bannerSub}>{dismissLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bannerWrapper: {
    position: 'absolute',
    top: SH * 0.22,
    alignSelf: 'center',
  },
  banner: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  bannerText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: '#1A1A2E',
    marginBottom: 6,
  },
  bannerSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#9999B8',
  },
});
