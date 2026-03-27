import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

/**
 * Handles the deep-link callback after native OAuth (Google / Apple).
 * Expo Router navigates here when the app receives hangout://auth/callback?access_token=...
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error first
      if (params.error) {
        console.error('[auth/callback] OAuth error:', params.error, params.error_description);
        router.replace('/(auth)/welcome');
        return;
      }

      // Try params from the deep-link URL
      if (params.access_token && params.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          router.replace('/(tabs)/');
          return;
        } catch (err) {
          console.error('[auth/callback] setSession error:', err);
        }
      }

      // Fallback: check if a session already exists (e.g. set by welcome.tsx)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/(tabs)/');
      } else {
        router.replace('/(auth)/welcome');
      }
    };

    handleCallback();
  }, [params.access_token, params.refresh_token, params.error]);

  return (
    <View className="flex-1 items-center justify-center bg-warmwhite">
      <ActivityIndicator size="large" color="#FF6B4A" />
      <Text
        className="text-charcoal/60 text-sm mt-4"
        style={{ fontFamily: 'Inter-Regular' }}
      >
        Signing you in…
      </Text>
    </View>
  );
}
