import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useEvent } from '@/hooks/useEvent';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/claude';
import { showAlert } from '@/components/Toast';

const HERO_COLORS = [
  { key: 'coral', color: '#FF6B4A', label: 'Coral' },
  { key: 'violet', color: '#7B61FF', label: 'Violet' },
  { key: 'mint', color: '#06D6A0', label: 'Mint' },
  { key: 'golden', color: '#FFD166', label: 'Golden' },
  { key: 'charcoal', color: '#2E2E50', label: 'Charcoal' },
];

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useEvent(id);

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [heroColor, setHeroColor] = useState('coral');

  // Pre-populate form when event data loads
  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setEventDate(event.event_date ?? '');
      setLocation(event.location ?? '');
      setDescription(event.description ?? '');
      setHeroColor(event.hero_color ?? 'coral');
    }
  }, [event]);

  const isAdmin = event?.admin_id === user?.id;

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof apiClient.updateEvent>[1]) =>
      apiClient.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.back();
    },
    onError: (err) => {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to update event.');
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      showAlert('Validation', 'Title is required.');
      return;
    }
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      event_date: eventDate.trim() || undefined,
      location: location.trim() || undefined,
      hero_color: heroColor,
    } as Parameters<typeof apiClient.updateEvent>[1]);
  };

  const handleMarkCompleted = () => {
    showAlert(
      'Complete Event',
      'Are you sure you want to mark this event as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () =>
            updateMutation.mutate({ status: 'completed' } as Parameters<typeof apiClient.updateEvent>[1]),
        },
      ],
    );
  };

  const handleCancelEvent = () => {
    showAlert(
      'Cancel Event',
      'Are you sure you want to cancel this event? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: () =>
            updateMutation.mutate({ status: 'cancelled' } as Parameters<typeof apiClient.updateEvent>[1]),
        },
      ],
    );
  };

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.replace('/(tabs)/');
    },
    onError: (err) => {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to delete event.');
    },
  });

  const handleDeleteEvent = () => {
    showAlert(
      'Delete Event',
      'Are you sure you want to permanently delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

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

  if (!isAdmin) {
    return (
      <View className="flex-1 bg-warmwhite items-center justify-center px-8">
        <Text className="text-charcoal/50 text-base" style={{ fontFamily: 'Inter-Regular' }}>
          Only the event admin can edit this event.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary text-sm" style={{ fontFamily: 'Inter-SemiBold' }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-warmwhite">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}
          className="flex-row items-center justify-between"
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#2E2E50" />
          </TouchableOpacity>
          <Text
            className="text-charcoal text-lg"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            Edit Event
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <View className="px-5">
          {/* Title */}
          <Text className="text-charcoal text-sm mb-1.5" style={{ fontFamily: 'Inter-SemiBold' }}>
            Title
          </Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal text-base mb-4"
            style={{ fontFamily: 'Inter-Regular' }}
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor="#999"
          />

          {/* Date */}
          <Text className="text-charcoal text-sm mb-1.5" style={{ fontFamily: 'Inter-SemiBold' }}>
            Date (ISO format)
          </Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal text-base mb-4"
            style={{ fontFamily: 'Inter-Regular' }}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="2026-04-15"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />

          {/* Location */}
          <Text className="text-charcoal text-sm mb-1.5" style={{ fontFamily: 'Inter-SemiBold' }}>
            Location
          </Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal text-base mb-4"
            style={{ fontFamily: 'Inter-Regular' }}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Central Park"
            placeholderTextColor="#999"
          />

          {/* Description */}
          <Text className="text-charcoal text-sm mb-1.5" style={{ fontFamily: 'Inter-SemiBold' }}>
            Description
          </Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal text-base mb-4"
            style={{ fontFamily: 'Inter-Regular', minHeight: 100, textAlignVertical: 'top' }}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the event..."
            placeholderTextColor="#999"
            multiline
          />

          {/* Hero Color */}
          <Text className="text-charcoal text-sm mb-3" style={{ fontFamily: 'Inter-SemiBold' }}>
            Theme Color
          </Text>
          <View className="flex-row gap-3 mb-6">
            {HERO_COLORS.map((c) => (
              <TouchableOpacity
                key={c.key}
                onPress={() => setHeroColor(c.key)}
                className="items-center"
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: c.color,
                    borderWidth: heroColor === c.key ? 3 : 0,
                    borderColor: '#2E2E50',
                  }}
                />
                <Text
                  className="text-charcoal/60 text-xs mt-1"
                  style={{ fontFamily: 'Inter-Regular' }}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending}
            className="rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: '#FF6B4A', opacity: updateMutation.isPending ? 0.6 : 1 }}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base" style={{ fontFamily: 'Inter-SemiBold' }}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          {/* Status actions - only for active events */}
          {event.status === 'active' && (
            <View className="mt-4 gap-3">
              <TouchableOpacity
                onPress={handleMarkCompleted}
                disabled={updateMutation.isPending}
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: '#06D6A0', opacity: updateMutation.isPending ? 0.6 : 1 }}
              >
                <Text className="text-white text-base" style={{ fontFamily: 'Inter-SemiBold' }}>
                  Mark as Completed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancelEvent}
                disabled={updateMutation.isPending}
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: '#EF4444', opacity: updateMutation.isPending ? 0.6 : 1 }}
              >
                <Text className="text-white text-base" style={{ fontFamily: 'Inter-SemiBold' }}>
                  Cancel Event
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Delete event - destructive, admin only */}
          <TouchableOpacity
            onPress={handleDeleteEvent}
            disabled={deleteMutation.isPending}
            className="mt-8 rounded-xl py-4 items-center border border-red-200"
            style={{ backgroundColor: '#FEF2F2', opacity: deleteMutation.isPending ? 0.6 : 1 }}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text className="text-red-500 text-base" style={{ fontFamily: 'Inter-SemiBold' }}>
                Delete event
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
