import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';
import { showAlert } from '@/components/Toast';

// Required for expo-web-browser OAuth on native
WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);

  const signInWith = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider);
    try {
      // On web: redirect back to the same origin so detectSessionInUrl picks up the tokens.
      // On native: use the deep-link scheme so Expo Router routes to /(auth)/callback.
      const redirectTo =
        Platform.OS === 'web'
          ? (typeof window !== 'undefined' ? window.location.origin : 'https://dist-sable-pi.vercel.app') + '/'
          : Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web', // let expo-web-browser handle it on native
        },
      });
      if (error) throw error;

      // Native: open the OAuth URL in an in-app browser
      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          const accessToken = parsed.queryParams?.access_token as string | undefined;
          const refreshToken = parsed.queryParams?.refresh_token as string | undefined;
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            router.replace('/(tabs)/');
          }
        }
      }
    } catch (err) {
      showAlert('Sign in failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <LinearGradient
      colors={['#FF6B4A', '#FF9472', '#FFD166']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 px-8"
        style={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }}
      >
        {/* Logo + tagline */}
        <View className="flex-1 justify-center items-center">
          <View className="mb-6 w-24 h-24 rounded-3xl bg-white/20 items-center justify-center">
            <Text style={{ fontSize: 48 }}>🎉</Text>
          </View>

          <Text
            className="text-white text-5xl font-bold mb-4 tracking-tight"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            Hangout
          </Text>

          <Text
            className="text-white/90 text-xl text-center leading-relaxed"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            Describe your event.{'\n'}AI handles the rest.
          </Text>

          {/* Feature pills */}
          <View className="flex-row flex-wrap gap-2 justify-center mt-10">
            {[
              { icon: '✨', label: 'AI planning' },
              { icon: '🔗', label: 'Invite friends' },
              { icon: '✅', label: 'Claim items' },
            ].map(({ icon, label }) => (
              <View
                key={label}
                className="flex-row items-center bg-white/20 rounded-full px-4 py-2"
              >
                <Text className="mr-1 text-sm">{icon}</Text>
                <Text
                  className="text-white text-sm"
                  style={{ fontFamily: 'Inter-Medium' }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Auth buttons */}
        <View className="gap-3">
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={() => signInWith('apple')}
              disabled={loadingProvider !== null}
              className="flex-row items-center justify-center bg-charcoal rounded-2xl py-4 px-6"
              activeOpacity={0.85}
            >
              {loadingProvider === 'apple' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text
                    className="text-white text-base ml-3"
                    style={{ fontFamily: 'Inter-SemiBold' }}
                  >
                    Continue with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => signInWith('google')}
            disabled={loadingProvider !== null}
            className="flex-row items-center justify-center bg-white rounded-2xl py-4 px-6"
            activeOpacity={0.85}
          >
            {loadingProvider === 'google' ? (
              <ActivityIndicator color="#FF6B4A" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text
                  className="text-charcoal text-base ml-3"
                  style={{ fontFamily: 'Inter-SemiBold' }}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/sign-in')}
            disabled={loadingProvider !== null}
            className="items-center py-3"
            activeOpacity={0.7}
          >
            <Text
              className="text-white/80 text-sm"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              Sign in with email instead
            </Text>
          </TouchableOpacity>

          <Text
            className="text-white/50 text-xs text-center mt-2"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            By continuing you agree to Hangout's{'\n'}Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
