import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface Particle {
  id: number;
  x: number;         // start X (0–1 relative to screen width)
  color: string;
  shape: 'circle' | 'square' | 'strip';
  size: number;
  vx: number;        // horizontal velocity
  vy: number;        // initial upward velocity (negative = up)
  spin: number;      // rotation speed multiplier
  delay: number;     // ms before launch
}

const COLORS = ['#FF6B4A', '#7B61FF', '#FFD166', '#06D6A0', '#FF9472', '#9985FF', '#FFC233', '#34E8B7'];
const SHAPES: Particle['shape'][] = ['circle', 'square', 'strip'];

export function buildParticles(count = 60): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random(),
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)]!,
    size: 6 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 280,
    vy: -(200 + Math.random() * 350),
    spin: (Math.random() - 0.5) * 720,
    delay: Math.random() * 300,
  }));
}

/**
 * Controls the visibility of the celebration overlay.
 * Returns `visible`, `trigger()`, and `dismiss()`.
 */
export function useCelebration() {
  const visible = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    visible.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [visible]);

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    visible.value = 1;
    // Auto-dismiss after 3.2 s
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 3200);
  }, [visible, dismiss]);

  return { visible, trigger, dismiss };
}
