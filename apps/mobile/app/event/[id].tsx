import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useEvent, useEventMembers } from '@/hooks/useEvent';
import { useItems } from '@/hooks/useItems';
import { useAuthStore } from '@/stores/authStore';
import { ProgressRing } from '@/components/ProgressRing';
import { AvatarGroup } from '@/components/AvatarGroup';
import { ItemCard } from '@/components/ItemCard';
import { apiClient } from '@/lib/claude';
import type { Category } from '@hangout/shared';

const HERO_GRADIENTS: Record<string, [string, string]> = {
  coral: ['#FF6B4A', '#FF9472'],
  violet: ['#7B61FF', '#9985FF'],
  mint: ['#06D6A0', '#34E8B7'],
  golden: ['#FFD166', '#FFC233'],
  charcoal: ['#2E2E50', '#44446A'],
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: items, isLoading: itemsLoading } = useItems(id);
  const { data: members } = useEventMembers(id);

  const claimedCount = items?.filter((i) => i.assignment != null).length ?? 0;
  const totalCount = items?.length ?? 0;
  const isAdmin = event?.admin_id === user?.id;

  const shareInvite = async () => {
    if (!event) return;
    const url = `hangout://invite/${event.invite_code}`;
    await Share.share({
      message: `Join "${event.title}" on Hangout! ${url}`,
      url,
    });
  };

  const claimMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      apiClient.claimItem(itemId),
    onMutate: async ({ itemId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['items', id] });
      const prev = queryClient.getQueryData(['items', id]);
      queryClient.setQueryData(['items', id], (old: typeof items) =>
        old?.map((item) =>
          item.id === itemId
            ? { ...item, assignment: { id: 'optimistic', item_id: itemId, user_id: user!.id, note: null, created_at: new Date().toISOString(), user: { id: user!.id, name: user!.name, avatar_url: user!.avatar_url } } }
            : item,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['items', id], context.prev);
      }
      Alert.alert('Error', 'Failed to claim item. Try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] });
    },
  });

  const unclaimMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      apiClient.unclaimItem(itemId),
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey: ['items', id] });
      const prev = queryClient.getQueryData(['items', id]);
      queryClient.setQueryData(['items', id], (old: typeof items) =>
        old?.map((item) =>
          item.id === itemId ? { ...item, assignment: null } : item,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['items', id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] });
    },
  });

  if (eventLoading) {
    return (
      <View className="flex-1 bg-warmwhite items-center justify-center">
        <ActivityIndicator color="#FF6B4A" size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-warmwhite items-center justify-center px-8">
        <Text className="text-charcoal/50 text-base" style={{ fontFamily: 'Inter-Regular' }}>
          Event not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary text-sm" style={{ fontFamily: 'Inter-SemiBold' }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [colorStart, colorEnd] = HERO_GRADIENTS[event.hero_color] ?? HERO_GRADIENTS.coral;

  // Group items by category
  const itemsByCategory = (items ?? []).reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.category ?? 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(item);
    return acc;
  }, {});

  return (
    <View className="flex-1 bg-warmwhite">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          style={{
            backgroundColor: colorStart,
            paddingTop: insets.top + 12,
            paddingBottom: 32,
            paddingHorizontal: 20,
          }}
        >
          {/* Nav row */}
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={shareInvite}
                className="flex-row items-center bg-white/20 rounded-full px-4 py-2 gap-2"
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text
                  className="text-white text-sm"
                  style={{ fontFamily: 'Inter-SemiBold' }}
                >
                  Invite
                </Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => router.push(`/event/${id}/items`)}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                >
                  <Ionicons name="settings-outline" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Event info */}
          <Text
            className="text-white text-3xl mb-2"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            {event.title}
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {event.event_date && (
              <HeroBadge icon="calendar-outline" label={formatDate(event.event_date)} />
            )}
            {event.location && (
              <HeroBadge icon="location-outline" label={event.location} />
            )}
          </View>

          {/* Progress + members row */}
          <View className="flex-row items-center justify-between bg-white/15 rounded-2xl p-4">
            <View className="flex-row items-center gap-3">
              <ProgressRing
                progress={totalCount > 0 ? claimedCount / totalCount : 0}
                size={48}
                strokeWidth={4}
                color="#fff"
                trackColor="rgba(255,255,255,0.3)"
              />
              <View>
                <Text
                  className="text-white text-lg"
                  style={{ fontFamily: 'PlusJakartaSans-Bold' }}
                >
                  {claimedCount}/{totalCount}
                </Text>
                <Text
                  className="text-white/70 text-xs"
                  style={{ fontFamily: 'Inter-Regular' }}
                >
                  items claimed
                </Text>
              </View>
            </View>

            {members && members.length > 0 && (
              <AvatarGroup
                users={members.map((m) => m.user).filter(Boolean) as Array<{ id: string; name: string; avatar_url: string | null }>}
                maxVisible={4}
                size={32}
              />
            )}
          </View>
        </View>

        {/* Items by category */}
        <View className="px-5 pt-6">
          {itemsLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#FF6B4A" />
            </View>
          ) : Object.keys(itemsByCategory).length === 0 ? (
            <View className="items-center py-10">
              <Text className="text-charcoal/40 text-base" style={{ fontFamily: 'Inter-Regular' }}>
                No items yet.
              </Text>
            </View>
          ) : (
            Object.entries(itemsByCategory).map(([category, catItems]) => (
              <View key={category} className="mb-6">
                <Text
                  className="text-charcoal text-base mb-3"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                >
                  {categoryEmoji(category as Category)} {category}
                </Text>
                <View className="gap-2">
                  {catItems?.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      currentUserId={user?.id}
                      onClaim={() => claimMutation.mutate({ itemId: item.id })}
                      onUnclaim={() => unclaimMutation.mutate({ itemId: item.id })}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HeroBadge({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.9)" />
      <Text
        className="text-white/90 text-xs"
        style={{ fontFamily: 'Inter-Medium' }}
      >
        {label}
      </Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function categoryEmoji(cat: Category): string {
  const map: Record<string, string> = {
    Food: '🍕', Drinks: '🥤', Equipment: '🔧',
    Decorations: '🎨', Games: '🎮', Transport: '🚗',
    Logistics: '📋', Tasks: '✅',
  };
  return map[cat] ?? '📦';
}
