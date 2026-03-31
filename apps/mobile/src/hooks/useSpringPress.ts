import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface SpringPressOptions {
  /** Scale at rest (default 1) */
  restScale?: number;
  /** Scale when pressed (default 0.94) */
  pressScale?: number;
  /** Trigger light haptic on press-in (default true) */
  haptic?: boolean;
}

/**
 * Returns `animatedStyle` and gesture handlers (`onPressIn` / `onPressOut`)
 * to wire up a spring-based press animation on an Animated.View.
 *
 * Usage:
 *   const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
 *   <Animated.View style={animatedStyle}>...</Animated.View>
 */
export function useSpringPress({
  restScale = 1,
  pressScale = 0.94,
  haptic = true,
}: SpringPressOptions = {}) {
  const scale = useSharedValue(restScale);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(pressScale, {
      damping: 15,
      stiffness: 300,
      mass: 0.6,
    });
    if (haptic) runOnJS(triggerHaptic)();
  }, [scale, pressScale, haptic, triggerHaptic]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(restScale, {
      damping: 12,
      stiffness: 200,
      mass: 0.8,
    });
  }, [scale, restScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}
