import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { useMyEventsWithCounts } from '@/hooks/useEvent';
import { EventCard } from '@/components/EventCard';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: events, isLoading, isRefetching, refetch } = useMyEventsWithCounts();

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const upcomingEvents = events?.filter(
    (e) => e.status === 'active' || e.status === 'draft',
  ) ?? [];

  const pastEvents = events?.filter(
    (e) => e.status === 'completed' || e.status === 'cancelled',
  ) ?? [];

  return (
    <View
      className="flex-1 bg-warmwhite"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text
            className="text-charcoal/60 text-sm"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            Good {getGreeting()}
          </Text>
          <Text
            className="text-charcoal text-2xl"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            Hey, {firstName} 👋
          </Text>
        </View>

        {/* New event FAB */}
        <TouchableOpacity
          onPress={() => router.push('/event/create')}
          className="flex-row items-center bg-primary rounded-2xl px-4 py-3 gap-1.5"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text
            className="text-white text-sm"
            style={{ fontFamily: 'Inter-SemiBold' }}
          >
            New event
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FF6B4A"
          />
        }
      >
        {isLoading ? (
          <View className="items-center justify-center pt-20">
            <ActivityIndicator color="#FF6B4A" size="large" />
          </View>
        ) : upcomingEvents.length === 0 && pastEvents.length === 0 ? (
          <EmptyState onCreatePress={() => router.push('/event/create')} />
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <View className="mt-6">
                <Text
                  className="text-charcoal text-lg mb-4"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                >
                  Upcoming
                </Text>
                <View className="gap-3">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/event/${event.id}`)}
                      claimedCount={event.claimedCount}
                      totalItems={event.totalItems}
                    />
                  ))}
                </View>
              </View>
            )}

            {pastEvents.length > 0 && (
              <View className="mt-8">
                <Text
                  className="text-charcoal/50 text-base mb-3"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                >
                  Past events
                </Text>
                <View className="gap-3">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/event/${event.id}`)}
                      muted
                      claimedCount={event.claimedCount}
                      totalItems={event.totalItems}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View className="items-center justify-center pt-20 px-8">
      <Text className="text-5xl mb-6">🎉</Text>
      <Text
        className="text-charcoal text-xl text-center mb-3"
        style={{ fontFamily: 'PlusJakartaSans-Bold' }}
      >
        No hangouts yet
      </Text>
      <Text
        className="text-charcoal/60 text-base text-center mb-8 leading-6"
        style={{ fontFamily: 'Inter-Regular' }}
      >
        Describe your first event and let AI plan everything — what to bring, who brings what.
      </Text>
      <TouchableOpacity
        onPress={onCreatePress}
        className="bg-primary rounded-2xl px-8 py-4"
        activeOpacity={0.85}
      >
        <Text
          className="text-white text-base"
          style={{ fontFamily: 'Inter-SemiBold' }}
        >
          Plan a hangout
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
