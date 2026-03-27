import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// Custom storage adapter — SecureStore on native, localStorage on web
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string): string | null => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key: string, value: string): void => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string): void => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      },
    };
  }
  // Native: use expo-secure-store
  const SecureStore = require('expo-secure-store');
  return {
    getItem: (key: string): string | null | Promise<string | null> => {
      return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string): Promise<void> => {
      return SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string): Promise<void> => {
      return SecureStore.deleteItemAsync(key);
    },
  };
};

const storageAdapter = createStorageAdapter();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export type { Session };
