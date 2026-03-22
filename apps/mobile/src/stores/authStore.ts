import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { User } from '@hangout/shared';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false,

  setSession: (session) => set({ session, isInitialized: true }),
  setUser: (user) => set({ user }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  reset: () => set({ session: null, user: null, isInitialized: true }),
}));
