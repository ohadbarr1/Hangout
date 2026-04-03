import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, StyleSheet } from 'react-native';
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
    { label: t('my_events_tab_all'),    value: 'all' },
    { label: t('my_events_tab_active'), value: EventStatus.Active },
    { label: t('my_events_tab_draft'),  value: EventStatus.Draft },
    { label: t('my_events_tab_done'),   value: EventStatus.Completed },
  ];

  const filtered = (events ?? []).filter((e) => {
    if (activeTab !== 'all' && e.status !== activeTab) return false;
    if (search.trim() && !e.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('my_events_title')}</Text>
          {!isLoading && (
            <Text style={styles.subtitle}>
              {(events ?? []).length} event{(events ?? []).length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color="#B8B8D0" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('my_events_search')}
          placeholderTextColor="#C8C8D8"
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="#C8C8D8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF6B4A" />
        }
      >
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={44} color="#D8D8E8" />
            <Text style={styles.emptyText}>{t('my_events_empty')}</Text>
            <TouchableOpacity onPress={() => router.push('/event/create')} style={styles.emptyLink}>
              <Text style={styles.emptyLinkText}>{t('home_new_event')}</Text>
              <Ionicons name="arrow-forward" size={14} color="#FF6B4A" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
                claimedCount={event.claimedCount}
                totalItems={event.totalItems}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#B8B8D0',
    marginTop: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1A1A2E',
    padding: 0,
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,46,0.07)',
  },
  tabActive: {
    backgroundColor: '#1A1A2E',
    borderColor: '#1A1A2E',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: 'rgba(26,26,46,0.5)',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#C8C8D8',
    textAlign: 'center',
  },
  emptyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  emptyLinkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B4A',
  },
});
