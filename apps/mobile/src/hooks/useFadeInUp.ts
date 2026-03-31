import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface FadeInUpOptions {
  /** Delay before this item starts animating (ms) */
  delay?: number;
  /** Starting Y offset (default 20) */
  fromY?: number;
  /** Duration of the fade (ms, default 300) */
  duration?: number;
}

/**
 * Staggered entrance animation — slides up from `fromY` and fades in.
 *
 * Usage (in a list):
 *   const { animatedStyle } = useFadeInUp({ delay: index * 60 });
 *   <Animated.View style={animatedStyle}>...</Animated.View>
 */
export function useFadeInUp({
  delay = 0,
  fromY = 20,
  duration = 280,
}: FadeInUpOptions = {}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(fromY);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 18, stiffness: 200, mass: 0.7 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle };
}
