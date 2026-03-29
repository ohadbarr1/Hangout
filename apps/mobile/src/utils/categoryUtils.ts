import type { Category } from '@hangout/shared';

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Drinks: '🥤',
  Equipment: '🎒',
  Decorations: '🎨',
  Games: '🎮',
  Transport: '🚗',
  Logistics: '📋',
  Tasks: '✅',
  Other: '📦',
};

export function categoryEmoji(category: Category | string): string {
  return CATEGORY_EMOJI[category] ?? '📦';
}
