import { create } from 'zustand';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Lang = 'en' | 'he';
const STORAGE_KEY = 'hangout_language';

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  init: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  lang: 'en',

  init: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored === 'en' || stored === 'he') {
        set({ lang: stored });
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(stored === 'he');
      }
    } catch {
      // ignore — keep default
    }
  },

  setLang: async (lang: Lang) => {
    set({ lang });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(lang === 'he');
  },
}));
