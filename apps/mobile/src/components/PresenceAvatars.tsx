import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import type { PresenceUser } from '@/hooks/usePresence';
import { useT } from '@/i18n';

interface PresenceAvatarsProps {
  viewers: PresenceUser[];
  maxVisible?: number;
}

/**
 * Shows small pulsing avatar dots for people currently viewing the event.
 * Only renders when there are active viewers.
 */
export function PresenceAvatars({ viewers, maxVisible = 3 }: PresenceAvatarsProps) {
  const { t } = useT();
  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, maxVisible);
  const overflow = viewers.length - visible.length;
  const names = `${visible.map((v) => v.name.split(' ')[0]).join(', ')}${overflow > 0 ? ` +${overflow}` : ''}`;
  const label = viewers.length === 1
    ? t('presence_single', { name: visible[0]!.name.split(' ')[0] })
    : t('presence_multiple', { names });

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      style={styles.container}
    >
      <PulseDot />
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

function PulseDot() {
  return (
    <View style={styles.dotWrapper}>
      <Animated.View style={styles.dotPulse} />
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dotWrapper: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    position: 'absolute',
  },
  dotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
