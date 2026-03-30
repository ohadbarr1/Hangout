import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import { useEvent, useEventMembers } from '@/hooks/useEvent';
import { useItems } from '@/hooks/useItems';
import { useAuthStore } from '@/stores/authStore';
import { ProgressRing } from '@/components/ProgressRing';
import { AvatarGroup } from '@/components/AvatarGroup';
import { ItemCard } from '@/components/ItemCard';
import { apiClient } from '@/lib/claude';
import type { ActivityItem } from '@/lib/claude';
import { showAlert } from '@/components/Toast';
import { EventDetailHeroSkeleton, ItemCardSkeleton } from '@/components/Skeleton';
import type { Category, EventMember } from '@hangout/shared';
import { formatDate } from '@/utils/dateUtils';
import { categoryEmoji } from '@/utils/categoryUtils';

function getCountdown(eventDate: string): string | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return null;
  if (diff === 1) return '🔔 Tomorrow!';
  if (diff <= 7) return `⏳ ${diff} days to go`;
  return null;
}

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

  const { data: event, isLoading: eventLoading, refetch: refetchEvent } = useEvent(id);
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useItems(id);
  const { data: members, refetch: refetchMembers } = useEventMembers(id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentItemId, setCommentItemId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const { data: activity } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => apiClient.getActivity(id!),
    staleTime: 60_000,
    enabled: !!id,
  });

  const myMembership = members?.find((m) => m.user_id === user?.id);
  const myRsvp = myMembership?.rsvp_status ?? null;

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvent(), refetchItems(), refetchMembers()]);
    setIsRefreshing(false);
  };

  const claimedCount = items?.filter((i) => i.assignment != null).length ?? 0;
  const totalCount = items?.length ?? 0;
  const isAdmin = event?.admin_id === user?.id;

  const shareInvite = async () => {
    if (!event) return;
    try {
      // Create a tracked invite token in the invites table so the deep-link
      // screen can look it up via GET /invites/:token.
      const invite = await apiClient.createInvite(event.id);

      const url =
        Platform.OS === 'web'
          ? `${window.location.origin}/invite/${invite.token}`
          : `hangout://invite/${invite.token}`;

      const shareText = `Join "${event.title}" on Hangout! ${url}`;

      if (Platform.OS === 'web') {
        // Use Web Share API if available, otherwise copy to clipboard
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: event.title, text: shareText, url });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          showAlert('Copied!', 'Invite link copied to clipboard.');
        }
      } else {
        await Share.share({
          message: shareText,
          url,
        });
      }
    } catch (err) {
      // User cancelling the share dialog throws — ignore that, only alert real errors
      if (err instanceof Error && err.message !== 'Share was dismissed') {
        showAlert('Error', 'Could not generate invite link. Try again.');
      }
    }
  };

  const handleClone = async () => {
    if (cloning) return;
    setCloning(true);
    try {
      const cloned = await apiClient.cloneEvent(id!);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.replace(`/event/${cloned.id}`);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to clone event.');
    } finally {
      setCloning(false);
    }
  };

  const claimMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      apiClient.claimItem(itemId),
    onMutate: async ({ itemId }) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
      }
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
      showAlert('Error', 'Failed to claim item. Try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] });
    },
  });

  const unclaimMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      apiClient.unclaimItem(itemId),
    onMutate: async ({ itemId }) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      }
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

  const rsvpMutation = useMutation({
    mutationFn: (rsvp_status: 'going' | 'maybe' | 'not_going') =>
      apiClient.updateRsvp(id!, rsvp_status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-members', id] });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      }
    },
    onError: () => {
      showAlert('Error', 'Failed to update RSVP. Try again.');
    },
  });

  if (eventLoading) {
    return (
      <View className="flex-1 bg-warmwhite">
        <EventDetailHeroSkeleton />
        <View className="px-5 pt-6 gap-3">
          <ItemCardSkeleton />
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </View>
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

  const [colorStart] = HERO_GRADIENTS[event.hero_color] ?? HERO_GRADIENTS.coral;
  const isLightHero = ['mint', 'golden'].includes(event.hero_color);
  const countdown = event.event_date ? getCountdown(event.event_date) : null;

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
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FF6B4A" />
        }
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
                <>
                  <TouchableOpacity
                    onPress={handleClone}
                    className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  >
                    {cloning ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="copy-outline" size={20} color="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(`/event/${id}/edit`)}
                    className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(`/event/${id}/items`)}
                    className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  >
                    <Ionicons name="settings-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Event info */}
          <Text
            className="text-white text-3xl mb-2"
            style={[
              { fontFamily: 'PlusJakartaSans-Bold' },
              isLightHero && { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
            ]}
          >
            {event.title}
          </Text>
          {event.description ? (
            <Text
              className="text-white/75 text-sm mb-3 leading-5"
              style={[
                { fontFamily: 'Inter-Regular' },
                isLightHero && { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
              ]}
              numberOfLines={3}
            >
              {event.description}
            </Text>
          ) : null}
          {countdown && (
            <View className="self-start bg-white/25 rounded-full px-3 py-1 mb-3">
              <Text className="text-white text-xs" style={{ fontFamily: 'Inter-SemiBold' }}>
                {countdown}
              </Text>
            </View>
          )}
          <View className="flex-row flex-wrap gap-3 mb-5">
            {event.event_date && (
              <HeroBadge icon="calendar-outline" label={formatDate(event.event_date)} isLight={isLightHero} />
            )}
            {event.location && (
              <HeroBadge icon="location-outline" label={event.location} isLight={isLightHero} />
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
              isAdmin ? (
                <TouchableOpacity onPress={() => setShowMembers(true)} activeOpacity={0.8}>
                  <AvatarGroup
                    users={members.map((m) => m.user).filter(Boolean) as Array<{ id: string; name: string; avatar_url: string | null }>}
                    maxVisible={4}
                    size={32}
                  />
                </TouchableOpacity>
              ) : (
                <AvatarGroup
                  users={members.map((m) => m.user).filter(Boolean) as Array<{ id: string; name: string; avatar_url: string | null }>}
                  maxVisible={4}
                  size={32}
                />
              )
            )}
          </View>
        </View>

        {/* RSVP buttons */}
        {myMembership && (
          <View className="px-5 pt-5">
            <Text
              className="text-charcoal/50 text-xs mb-2"
              style={{ fontFamily: 'Inter-Medium' }}
            >
              Your RSVP
            </Text>
            <View className="flex-row gap-2">
              {([
                { status: 'going' as const, label: 'Going', emoji: '✅' },
                { status: 'maybe' as const, label: 'Maybe', emoji: '🤔' },
                { status: 'not_going' as const, label: "Can't go", emoji: '❌' },
              ]).map(({ status, label, emoji }) => {
                const isSelected = myRsvp === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => !isAdmin && rsvpMutation.mutate(status)}
                    disabled={isAdmin || rsvpMutation.isPending}
                    className={`flex-1 flex-row items-center justify-center rounded-2xl py-2.5 gap-1.5 border ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-white border-charcoal/10'
                    }`}
                    activeOpacity={isAdmin ? 1 : 0.75}
                  >
                    <Text style={{ fontSize: 13 }}>{emoji}</Text>
                    <Text
                      className={`text-xs ${isSelected ? 'text-white' : 'text-charcoal/70'}`}
                      style={{ fontFamily: 'Inter-Medium' }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Items by category */}
        <View className="px-5 pt-6">
          {itemsLoading ? (
            <View className="gap-3 pb-6">
              <ItemCardSkeleton />
              <ItemCardSkeleton />
              <ItemCardSkeleton />
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
                      onPress={() => setCommentItemId(item.id)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Activity Feed */}
        {activity && activity.length > 0 && (
          <View className="px-5 pt-4 pb-2">
            <Text className="text-charcoal text-base mb-3" style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}>
              Activity
            </Text>
            <View className="gap-2">
              {activity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {commentItemId && (
        <CommentsModal
          itemId={commentItemId}
          currentUserId={user?.id ?? ''}
          onClose={() => setCommentItemId(null)}
        />
      )}
      {showMembers && isAdmin && (
        <MembersModal
          members={members ?? []}
          adminId={event.admin_id}
          currentUserId={user?.id ?? ''}
          eventId={id!}
          onClose={() => setShowMembers(false)}
          onRoleChange={async (memberId, role) => {
            try {
              await apiClient.updateMemberRole(id!, memberId, role);
              queryClient.invalidateQueries({ queryKey: ['event-members', id] });
            } catch (err) {
              showAlert('Error', 'Failed to update role.');
            }
          }}
        />
      )}
    </View>
  );
}

function HeroBadge({ icon, label, isLight }: { icon: keyof typeof Ionicons.glyphMap; label: string; isLight?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.9)" />
      <Text
        className="text-white/90 text-xs"
        style={[
          { fontFamily: 'Inter-Medium' },
          isLight && { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

function activityEmoji(type: ActivityItem['type']): string {
  switch (type) {
    case 'join': return '👋';
    case 'claim': return '✅';
    case 'unclaim': return '↩️';
    case 'event_update': return '📅';
    case 'all_claimed': return '🎉';
    default: return '•';
  }
}

function formatActivityLabel(item: ActivityItem): string {
  const name = item.user?.name ?? 'Someone';
  switch (item.type) {
    case 'join': return `${name} joined the event`;
    case 'claim': return `${name} claimed ${(item.payload as Record<string, unknown> & { itemName?: string }).itemName ?? 'an item'}`;
    case 'unclaim': return `${name} unclaimed ${(item.payload as Record<string, unknown> & { itemName?: string }).itemName ?? 'an item'}`;
    case 'event_update': return `${name} updated the event`;
    case 'all_claimed': return '🎉 All items are claimed!';
    default: return 'Activity';
  }
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const label = formatActivityLabel(item);
  const timeAgo = formatTimeAgo(item.created_at);

  return (
    <View className="flex-row items-start gap-3">
      <View className="w-7 h-7 rounded-full bg-charcoal/8 items-center justify-center mt-0.5 shrink-0">
        <Text style={{ fontSize: 12 }}>{activityEmoji(item.type)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-charcoal/70 text-sm leading-5" style={{ fontFamily: 'Inter-Regular' }}>
          {label}
        </Text>
        <Text className="text-charcoal/35 text-xs mt-0.5" style={{ fontFamily: 'Inter-Regular' }}>
          {timeAgo}
        </Text>
      </View>
    </View>
  );
}

function CommentsModal({
  itemId,
  currentUserId,
  onClose,
}: {
  itemId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', itemId],
    queryFn: () => apiClient.getComments(itemId),
    staleTime: 30_000,
  });

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await apiClient.addComment(itemId, trimmed);
      setText('');
      queryClient.invalidateQueries({ queryKey: ['comments', itemId] });
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // currentUserId param reserved for future use (e.g. own-comment highlighting)
  void currentUserId;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-warmwhite rounded-t-3xl" style={{ maxHeight: '70%' }}>
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-charcoal/20 rounded-full" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-4">
            <Text className="text-charcoal text-lg" style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}>
              Comments
            </Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-charcoal/8 items-center justify-center">
              <Ionicons name="close" size={16} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <ActivityIndicator color="#FF6B4A" className="py-8" />
            ) : (comments ?? []).length === 0 ? (
              <Text className="text-charcoal/40 text-sm text-center py-8" style={{ fontFamily: 'Inter-Regular' }}>
                No comments yet. Be the first!
              </Text>
            ) : (
              <View className="gap-4 pb-4">
                {(comments ?? []).map((c) => (
                  <View key={c.id} className="flex-row gap-3">
                    <View className="w-7 h-7 rounded-full bg-primary/15 items-center justify-center shrink-0">
                      <Text className="text-primary text-xs" style={{ fontFamily: 'PlusJakartaSans-Bold' }}>
                        {c.user?.name?.charAt(0).toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-charcoal/50 text-xs mb-0.5" style={{ fontFamily: 'Inter-Medium' }}>
                        {c.user?.name ?? 'Unknown'} · {formatTimeAgo(c.created_at)}
                      </Text>
                      <Text className="text-charcoal text-sm leading-5" style={{ fontFamily: 'Inter-Regular' }}>
                        {c.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Input row */}
          <View className="flex-row items-center gap-3 px-5 py-4 border-t border-charcoal/8">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor="#9999B8"
              className="flex-1 bg-white border border-charcoal/10 rounded-2xl px-4 py-3 text-charcoal text-sm"
              style={{ fontFamily: 'Inter-Regular' }}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !text.trim()}
              className="w-10 h-10 rounded-full bg-primary items-center justify-center"
              style={{ opacity: submitting || !text.trim() ? 0.5 : 1 }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MembersModal({
  members,
  adminId,
  currentUserId,
  eventId,
  onClose,
  onRoleChange,
}: {
  members: EventMember[];
  adminId: string;
  currentUserId: string;
  eventId: string;
  onClose: () => void;
  onRoleChange: (memberId: string, role: 'admin' | 'guest') => Promise<void>;
}) {
  const [updating, setUpdating] = useState<string | null>(null);

  // eventId param reserved for future direct use
  void eventId;

  const handleToggleRole = async (member: EventMember) => {
    if (member.user_id === currentUserId) return;
    const newRole = member.role === 'admin' ? 'guest' : 'admin';
    const name = member.user?.name ?? 'this member';
    showAlert(
      newRole === 'admin' ? 'Promote to co-host?' : 'Remove co-host?',
      `${name} will ${newRole === 'admin' ? 'be able to edit the event and manage items' : 'become a regular guest'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newRole === 'admin' ? 'Promote' : 'Remove',
          onPress: async () => {
            setUpdating(member.id);
            await onRoleChange(member.id, newRole);
            setUpdating(null);
          },
        },
      ]
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-warmwhite rounded-t-3xl" style={{ maxHeight: '70%' }}>
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-charcoal/20 rounded-full" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-4">
            <Text className="text-charcoal text-lg" style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}>
              Members ({members.length})
            </Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-charcoal/8 items-center justify-center">
              <Ionicons name="close" size={16} color="#1A1A2E" />
            </TouchableOpacity>
          </View>
          <ScrollView className="px-5" style={{ maxHeight: 400 }}>
            <View className="gap-3 pb-6">
              {members.map((member) => {
                const isEventAdmin = member.user_id === adminId;
                const isCurrentUser = member.user_id === currentUserId;
                const isCoHost = member.role === 'admin' && !isEventAdmin;
                const isUpdating = updating === member.id;
                return (
                  <View key={member.id} className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center shrink-0">
                      <Text className="text-primary text-sm" style={{ fontFamily: 'PlusJakartaSans-Bold' }}>
                        {member.user?.name?.charAt(0).toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-charcoal text-sm" style={{ fontFamily: 'Inter-Medium' }}>
                        {member.user?.name ?? 'Unknown'}{isCurrentUser ? ' (you)' : ''}
                      </Text>
                      <Text className="text-charcoal/40 text-xs" style={{ fontFamily: 'Inter-Regular' }}>
                        {isEventAdmin ? '👑 Host' : isCoHost ? '🤝 Co-host' : 'Guest'}
                      </Text>
                    </View>
                    {!isEventAdmin && !isCurrentUser && (
                      <TouchableOpacity
                        onPress={() => handleToggleRole(member)}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-full border border-charcoal/15"
                        style={{ opacity: isUpdating ? 0.5 : 1 }}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#FF6B4A" />
                        ) : (
                          <Text className="text-charcoal/60 text-xs" style={{ fontFamily: 'Inter-Medium' }}>
                            {isCoHost ? 'Remove co-host' : 'Make co-host'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

