import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { useMyEventsWithCounts } from '@/hooks/useEvent';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EventStatus } from '@hangout/shared';
import { useT } from '@/i18n';

export default function MyEventsScreen() {
  const insets = useSafeAreaInsets();
  const { data: events, isLoading, isRefetching, refetch } = useMyEventsWithCounts();
  const [activeTab, setActiveTab] = useState<EventStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const { t } = useT();

  const STATUS_TABS: Array<{ label: string; value: EventStatus | 'all' }> = [
    { label: t('my_events_tab_all'), value: 'all' },
    { label: t('my_events_tab_active'), value: EventStatus.Active },
    { label: t('my_events_tab_draft'), value: EventStatus.Draft },
    { label: t('my_events_tab_done'), value: EventStatus.Completed },
  ];

  const filtered = (events ?? []).filter((e) => {
    if (activeTab !== 'all' && e.status !== activeTab) return false;
    if (search.trim() && !e.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

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
          {t('my_events_title')}
        </Text>
      </View>

      {/* Search */}
      <View className="px-5 pb-1">
        <View className="flex-row items-center bg-white border border-charcoal/8 rounded-2xl px-4 gap-2">
          <Ionicons name="search-outline" size={16} color="#9999B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('my_events_search')}
            placeholderTextColor="#9999B8"
            className="flex-1 py-3 text-charcoal text-sm"
            style={{ fontFamily: 'Inter-Regular' }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9999B8" />
            </TouchableOpacity>
          )}
        </View>
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
          <View className="gap-3 pt-2">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center pt-16">
            <Ionicons name="calendar-outline" size={48} color="#C8C8D8" />
            <Text
              className="text-charcoal/40 text-base mt-4 text-center"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              {t('my_events_empty')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/event/create')}
              className="mt-4"
            >
              <Text
                className="text-primary text-sm"
                style={{ fontFamily: 'Inter-SemiBold' }}
              >
                {t('home_new_event')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/event/${event.id}`)}
              claimedCount={event.claimedCount}
              totalItems={event.totalItems}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
