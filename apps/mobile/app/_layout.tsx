import { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Stack, SplashScreen, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import '../global.css';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProviderWithRef } from '@/components/Toast';
import { apiClient } from '@/lib/claude';

SplashScreen.preventAutoHideAsync();

async function registerPushToken() {
  if (Platform.OS === 'web') return; // web doesn't support push

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiClient.savePushToken(tokenData.data);
  } catch {
    // Non-critical
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { session, setSession, setUser, pendingInviteToken, setPendingInviteToken } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

  // Set web meta tags
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'Hangout — AI Event Planning';
    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('description', 'Describe your event, AI handles the rest. Plan hangouts, split items, invite friends.');
    setMeta('theme-color', '#FF6B4A');
    setMeta('og:title', 'Hangout — AI Event Planning', true);
    setMeta('og:description', 'Describe your event, AI handles the rest.', true);
    setMeta('og:type', 'website', true);
    setMeta('apple-mobile-web-app-capable', 'yes');
  }, []);

  // Bootstrap Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          name: data.session.user.user_metadata?.full_name ?? '',
          avatar_url: data.session.user.user_metadata?.avatar_url ?? null,
          expo_push_token: null,
          created_at: data.session.user.created_at,
        });
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser({
          id: newSession.user.id,
          email: newSession.user.email ?? '',
          name: newSession.user.user_metadata?.full_name ?? '',
          avatar_url: newSession.user.user_metadata?.avatar_url ?? null,
          expo_push_token: null,
          created_at: newSession.user.created_at,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser]);

  // Hide splash once fonts loaded + session resolved
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Redirect based on auth state once fonts are ready and session is resolved
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (!sessionChecked) return;
    if (session) {
      // If there's a pending invite token from before auth, redirect there
      if (pendingInviteToken) {
        const token = pendingInviteToken;
        setPendingInviteToken(null);
        router.replace(`/invite/${token}`);
      } else {
        router.replace('/(tabs)/');
      }
      registerPushToken();
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [fontsLoaded, fontError, session, sessionChecked]);

  if (!fontsLoaded && !fontError) return null;

  const appContent = (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ToastProviderWithRef>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="event/create"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen
              name="event/[id]/edit"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="event/[id]/items"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="event/[id]/dashboard" />
            <Stack.Screen
              name="invite/[token]"
              options={{ presentation: 'modal' }}
            />
          </Stack>
        </ToastProviderWithRef>
      </QueryClientProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F0EDEA', alignItems: 'center' }}>
        <View
          style={{
            maxWidth: 540,
            width: '100%',
            minHeight: '100%',
            backgroundColor: '#FAF9F7',
            boxShadow: '0 0 32px rgba(0,0,0,0.06)',
          }}
        >
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
}
