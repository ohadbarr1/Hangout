import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (mode === 'sign-up' && !name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Click it to activate your account.',
        );
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-warmwhite"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="flex-1 px-6"
          style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-charcoal/8 mb-8"
          >
            <Ionicons name="arrow-back" size={20} color="#1A1A2E" />
          </TouchableOpacity>

          {/* Heading */}
          <Text
            className="text-charcoal text-3xl mb-2"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text
            className="text-charcoal/60 text-base mb-8"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            {mode === 'sign-in'
              ? 'Sign in to see your events.'
              : 'Start planning better hangouts.'}
          </Text>

          {/* Fields */}
          <View className="gap-4">
            {mode === 'sign-up' && (
              <View>
                <Text
                  className="text-charcoal/70 text-sm mb-2"
                  style={{ fontFamily: 'Inter-Medium' }}
                >
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#9999B8"
                  autoCapitalize="words"
                  className="bg-white border border-charcoal/10 rounded-2xl px-4 py-4 text-charcoal text-base"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
              </View>
            )}

            <View>
              <Text
                className="text-charcoal/70 text-sm mb-2"
                style={{ fontFamily: 'Inter-Medium' }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9999B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white border border-charcoal/10 rounded-2xl px-4 py-4 text-charcoal text-base"
                style={{ fontFamily: 'Inter-Regular' }}
              />
            </View>

            <View>
              <Text
                className="text-charcoal/70 text-sm mb-2"
                style={{ fontFamily: 'Inter-Medium' }}
              >
                Password
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9999B8"
                  secureTextEntry={!showPassword}
                  className="bg-white border border-charcoal/10 rounded-2xl px-4 py-4 text-charcoal text-base pr-12"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((p) => !p)}
                  className="absolute right-4 top-4"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9999B8"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="mt-8 bg-primary rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className="text-white text-base"
                style={{ fontFamily: 'Inter-SemiBold' }}
              >
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle mode */}
          <View className="flex-row items-center justify-center mt-6">
            <Text
              className="text-charcoal/60 text-sm"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
              <Text
                className="text-primary text-sm"
                style={{ fontFamily: 'Inter-SemiBold' }}
              >
                {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
