import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);

  const signInWith = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'hangout://auth/callback',
        },
      });
      if (error) throw error;
    } catch (err) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Unknown error');
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
            className="text-white/60 text-xs text-center mt-2"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            By continuing you agree to our Terms of Service{'\n'}and Privacy Policy.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
