import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useMyEvents } from '@/hooks/useEvent';
import { EventCard } from '@/components/EventCard';
import type { EventStatus } from '@hangout/shared';

const STATUS_TABS: Array<{ label: string; value: EventStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Done', value: 'completed' },
];

import { useState } from 'react';

export default function MyEventsScreen() {
  const insets = useSafeAreaInsets();
  const { data: events, isLoading, isRefetching, refetch } = useMyEvents();
  const [activeTab, setActiveTab] = useState<EventStatus | 'all'>('all');

  const filtered = events?.filter(
    (e) => activeTab === 'all' || e.status === activeTab,
  ) ?? [];

  return (
    <View
      className="flex-1 bg-warmwhite"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text
          className="text-charcoal text-2xl"
          style={{ fontFamily: 'PlusJakartaSans-Bold' }}
        >
          My Events
        </Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}
      >
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full ${
              activeTab === tab.value
                ? 'bg-primary'
                : 'bg-white border border-charcoal/10'
            }`}
          >
            <Text
              className={activeTab === tab.value ? 'text-white text-sm' : 'text-charcoal/60 text-sm'}
              style={{ fontFamily: 'Inter-Medium' }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
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
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center pt-16">
            <Ionicons name="calendar-outline" size={48} color="#C8C8D8" />
            <Text
              className="text-charcoal/40 text-base mt-4 text-center"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              No {activeTab === 'all' ? '' : activeTab} events yet.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/event/create')}
              className="mt-4"
            >
              <Text
                className="text-primary text-sm"
                style={{ fontFamily: 'Inter-SemiBold' }}
              >
                Create one
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/event/${event.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
