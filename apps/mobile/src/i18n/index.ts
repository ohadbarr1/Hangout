import en, { type TranslationKeys } from './en';
import he from './he';
import { useLanguageStore } from '@/stores/languageStore';

type Translations = typeof en;
const translations: Record<string, Translations> = { en, he: he as unknown as Translations };

/**
 * Interpolates {{key}} placeholders in a string.
 * e.g. t('greeting_hey', { name: 'Ohad' }) → 'Hey, Ohad 👋'
 */
function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

/**
 * Translate a key with optional interpolation vars.
 * Falls back to English if the key is missing in the current language.
 */
export function translate(
  lang: string,
  key: TranslationKeys,
  vars?: Record<string, string | number>,
): string {
  const dict = translations[lang] ?? translations.en!;
  const str = (dict[key] ?? translations.en![key] ?? key) as string;
  return interpolate(str, vars);
}

/**
 * Hook — returns a `t()` function bound to the current language.
 * Components call: const { t } = useT();
 */
export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  const isRTL = lang === 'he';

  function t(key: TranslationKeys, vars?: Record<string, string | number>): string {
    return translate(lang, key, vars);
  }

  return { t, lang, isRTL };
}

export type { TranslationKeys };
