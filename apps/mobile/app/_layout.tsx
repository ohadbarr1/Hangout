import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, SplashScreen, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

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

  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

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

  // Redirect based on auth state once fonts are ready
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (session) {
      // If there's a pending invite token from before auth, redirect there
      if (pendingInviteToken) {
        const token = pendingInviteToken;
        setPendingInviteToken(null);
        router.replace(`/invite/${token}`);
      } else {
        router.replace('/(tabs)/');
      }
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [fontsLoaded, fontError, session]);

  if (!fontsLoaded && !fontError) return null;

  const appContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
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
          <Stack.Screen
            name="invite/[token]"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#E8E4DF', alignItems: 'center' }}>
        <View
          style={{
            maxWidth: 480,
            width: '100%',
            minHeight: '100%',
            backgroundColor: '#FAF9F7',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
}
