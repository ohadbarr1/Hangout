import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { apiClient } from '@/lib/claude';
import { useAuthStore } from '@/stores/authStore';
import { showAlert } from '@/components/Toast';
import { RsvpStatus } from '@hangout/shared';
import type { Invite } from '@hangout/shared';

type InviteState = 'loading' | 'preview' | 'joining' | 'error';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();

  const [state, setState] = useState<InviteState>('loading');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    setState('loading');
    try {
      const data = await apiClient.getInvite(token);
      setInvite(data);
      setState('preview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid or expired invite link.');
      setState('error');
    }
  };

  const { setPendingInviteToken } = useAuthStore();

  const handleAccept = async () => {
    if (!session) {
      setPendingInviteToken(token);
      router.replace(`/(auth)/welcome`);
      return;
    }

    setState('joining');
    try {
      await apiClient.acceptInvite(token, { rsvp_status: RsvpStatus.Going });
      if (invite?.event_id) {
        router.replace(`/event/${invite.event_id}`);
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err) {
      setState('preview');
      showAlert('Error', err instanceof Error ? err.message : 'Failed to join event.');
    }
  };

  const handleMaybe = async () => {
    setState('joining');
    try {
      await apiClient.acceptInvite(token, { rsvp_status: RsvpStatus.Maybe });
      if (invite?.event_id) {
        router.replace(`/event/${invite.event_id}`);
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err) {
      setState('preview');
      showAlert('Error', err instanceof Error ? err.message : 'Failed to join event.');
    }
  };

  return (
    <View
      className="flex-1 bg-warmwhite"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Close button */}
      <View className="px-5 pt-4">
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/')}
          className="w-10 h-10 rounded-full bg-charcoal/8 items-center justify-center"
        >
          <Ionicons name="close" size={20} color="#1A1A2E" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        {state === 'loading' && (
          <>
            <ActivityIndicator color="#FF6B4A" size="large" />
            <Text
              className="text-charcoal/50 text-base mt-4"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              Loading invite...
            </Text>
          </>
        )}

        {state === 'error' && (
          <>
            <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            </View>
            <Text
              className="text-charcoal text-xl text-center mb-3"
              style={{ fontFamily: 'PlusJakartaSans-Bold' }}
            >
              {errorMessage.toLowerCase().includes('expir') ? 'This invite has expired' : 'Invite not found'}
            </Text>
            <Text
              className="text-charcoal/50 text-base text-center mb-8 leading-6"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              {errorMessage.toLowerCase().includes('expir')
                ? 'Ask the organizer to send a new invite link.'
                : 'This link may be invalid or the event no longer exists.'}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/')}
              className="bg-primary rounded-2xl px-8 py-4"
            >
              <Text className="text-white text-base" style={{ fontFamily: 'Inter-SemiBold' }}>
                Go home
              </Text>
            </TouchableOpacity>
          </>
        )}

        {(state === 'preview' || state === 'joining') && invite?.event && (
          <>
            {/* Invite preview card */}
            <View className="w-full bg-white rounded-3xl p-6 shadow-sm shadow-charcoal/10 mb-8">
              {(() => {
                const HERO_COLORS: Record<string, string> = {
                  coral: '#FF6B4A', violet: '#7B61FF', mint: '#06D6A0', golden: '#FFD166', charcoal: '#2E2E50',
                };
                const heroColor = HERO_COLORS[(invite.event as any)?.hero_color] ?? '#FF6B4A';
                return (
                  <View
                    className="w-16 h-16 rounded-2xl items-center justify-center mb-5 self-center"
                    style={{ backgroundColor: heroColor }}
                  >
                    <Text className="text-3xl">🎉</Text>
                  </View>
                );
              })()}

              <Text
                className="text-charcoal/50 text-sm text-center mb-2"
                style={{ fontFamily: 'Inter-Regular' }}
              >
                You're invited to
              </Text>
              <Text
                className="text-charcoal text-2xl text-center mb-5"
                style={{ fontFamily: 'PlusJakartaSans-Bold' }}
              >
                {invite.event.title}
              </Text>

              <View className="gap-2">
                {invite.event.event_date && (
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="calendar-outline" size={16} color="#9999B8" />
                    <Text
                      className="text-charcoal/70 text-sm"
                      style={{ fontFamily: 'Inter-Regular' }}
                    >
                      {new Date(invite.event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                )}
                {invite.event.location && (
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="location-outline" size={16} color="#9999B8" />
                    <Text
                      className="text-charcoal/70 text-sm"
                      style={{ fontFamily: 'Inter-Regular' }}
                    >
                      {invite.event.location}
                    </Text>
                  </View>
                )}
                {/* Member count */}
                {(invite.event as any).member_count > 0 && (
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="people-outline" size={16} color="#9999B8" />
                    <Text className="text-charcoal/70 text-sm" style={{ fontFamily: 'Inter-Regular' }}>
                      {(invite.event as any).member_count} {(invite.event as any).member_count === 1 ? 'person' : 'people'} going
                    </Text>
                  </View>
                )}
                {/* Item count */}
                {(invite.event as any).item_count > 0 && (
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="bag-outline" size={16} color="#9999B8" />
                    <Text className="text-charcoal/70 text-sm" style={{ fontFamily: 'Inter-Regular' }}>
                      {(invite.event as any).item_count} items to claim
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {!session && (
              <Text
                className="text-charcoal/50 text-sm text-center mb-4"
                style={{ fontFamily: 'Inter-Regular' }}
              >
                You'll need to sign in first.
              </Text>
            )}

            <TouchableOpacity
              onPress={handleAccept}
              disabled={state === 'joining'}
              className="w-full bg-primary rounded-2xl py-4 items-center"
              activeOpacity={0.85}
            >
              {state === 'joining' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: 'Inter-SemiBold' }}
                >
                  {session ? "I'm in!" : 'Sign in to join'}
                </Text>
              )}
            </TouchableOpacity>

            {session && (
              <TouchableOpacity
                onPress={handleMaybe}
                disabled={state === 'joining'}
                className="w-full border border-charcoal/15 rounded-2xl py-4 items-center mt-3"
                activeOpacity={0.75}
              >
                <Text className="text-charcoal/60 text-base" style={{ fontFamily: 'Inter-Regular' }}>
                  Maybe — I'll let you know
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/')}
              className="mt-4 py-3"
            >
              <Text
                className="text-charcoal/50 text-sm"
                style={{ fontFamily: 'Inter-Regular' }}
              >
                Maybe later
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
