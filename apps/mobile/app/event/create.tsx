import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { NotificationFeedbackType } from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/claude';
import { showAlert } from '@/components/Toast';
import { ItemCard } from '@/components/ItemCard';
import { useT } from '@/i18n';
import type { ParsedEventResponse, ParsedCategory } from '@hangout/shared';

type Step = 'input' | 'loading' | 'review';

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const { t } = useT();

  const [step, setStep] = useState<Step>('input');
  const [description, setDescription] = useState(prefill ?? '');
  const [parsedEvent, setParsedEvent] = useState<ParsedEventResponse | null>(null);

  const parseMutation = useMutation({
    mutationFn: async (desc: string) => {
      const result = await apiClient.parseEvent(desc);
      return result;
    },
    onSuccess: (data) => {
      setParsedEvent(data);
      setStep('review');
    },
    onError: (err) => {
      setStep('input');
      showAlert('Error', err instanceof Error ? err.message : 'Failed to parse event. Please try again.');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!parsedEvent) throw new Error('No parsed event');
      return apiClient.createEventFromParsed(description, parsedEvent);
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      }
      showAlert('Event created!');
      router.replace(`/event/${event.id}`);
    },
    onError: (err) => {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to create event.');
    },
  });

  const handleParse = () => {
    if (!description.trim()) {
      showAlert('Describe your event', 'Tell us what you\'re planning.');
      return;
    }
    setStep('loading');
    parseMutation.mutate(description.trim());
  };

  const handleCreate = () => {
    createMutation.mutate();
  };

  const examplePrompts = [
    'Rooftop BBQ for 15 people this Saturday evening',
    'Game night at my place next Friday, 8 people',
    'Beach trip for 10 next weekend, leaving at 9am',
  ];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-warmwhite"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        className="px-5 flex-row items-center"
        style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-charcoal/8 mr-4"
        >
          <Ionicons name="close" size={20} color="#1A1A2E" />
        </TouchableOpacity>
        <Text
          className="text-charcoal text-xl flex-1"
          style={{ fontFamily: 'PlusJakartaSans-Bold' }}
        >
          {step === 'review' ? t('create_title_review') : t('create_title_input')}
        </Text>
        {step === 'review' && (
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => { setStep('loading'); parseMutation.mutate(description.trim()); }}
              disabled={parseMutation.isPending}
            >
              <Text
                className="text-charcoal/50 text-sm"
                style={{ fontFamily: 'Inter-Medium' }}
              >
                {t('create_regenerate')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setStep('input'); setParsedEvent(null); }}
            >
              <Text
                className="text-primary text-sm"
                style={{ fontFamily: 'Inter-Medium' }}
              >
                {t('create_edit')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {step === 'input' && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main input */}
          <View className="bg-white rounded-3xl p-5 shadow-sm shadow-charcoal/5 mb-6">
            <TextInput
              ref={inputRef}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Beach BBQ for 20 people next Saturday afternoon, bring chairs and snacks"
              placeholderTextColor="#9999B8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleParse}
              blurOnSubmit
              className="text-charcoal text-base leading-6"
              style={{
                fontFamily: 'Inter-Regular',
                minHeight: 120,
              }}
            />
          </View>

          {/* Example prompts */}
          <Text
            className="text-charcoal/50 text-sm mb-3"
            style={{ fontFamily: 'Inter-Medium' }}
          >
            {t('create_try_example')}
          </Text>
          <View className="gap-2 mb-8">
            {examplePrompts.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setDescription(p)}
                className="bg-white border border-charcoal/8 rounded-2xl px-4 py-3 flex-row items-center"
                activeOpacity={0.7}
              >
                <Text className="text-base mr-3">💡</Text>
                <Text
                  className="text-charcoal/70 text-sm flex-1"
                  style={{ fontFamily: 'Inter-Regular' }}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleParse}
            disabled={!description.trim()}
            className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${
              description.trim() ? 'bg-primary' : 'bg-charcoal/10'
            }`}
            activeOpacity={0.85}
          >
            <Text className="text-base">✨</Text>
            <Text
              className={`text-base ${description.trim() ? 'text-white' : 'text-charcoal/40'}`}
              style={{ fontFamily: 'Inter-SemiBold' }}
            >
              {t('create_generate_btn')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 'loading' && (
        <LoadingState
          onCancel={() => {
            parseMutation.reset();
            setStep('input');
          }}
        />
      )}

      {step === 'review' && parsedEvent && (
        <ReviewStep
          parsedEvent={parsedEvent}
          onConfirm={handleCreate}
          isCreating={createMutation.isPending}
          t={t}
          insets={{ bottom: insets.bottom }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function LoadingState({ onCancel }: { onCancel: () => void }) {
  const { t } = useT();
  const LOADING_MESSAGES = [
    t('create_loading_1'),
    t('create_loading_2'),
    t('create_loading_3'),
    t('create_loading_4'),
  ];
  const [messageIndex, setMessageIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = () => {
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        // Fade in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(cycle, 1800);
    return () => clearInterval(interval);
  }, [opacity]);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-8">
        <ActivityIndicator color="#FF6B4A" size="large" />
      </View>
      <Text
        className="text-charcoal text-xl text-center mb-4"
        style={{ fontFamily: 'PlusJakartaSans-Bold' }}
      >
        {t('create_loading_title')}
      </Text>
      <Animated.Text
        className="text-charcoal/50 text-base text-center leading-6"
        style={{ fontFamily: 'Inter-Regular', opacity }}
      >
        {LOADING_MESSAGES[messageIndex]}
      </Animated.Text>

      {/* Skeleton cards */}
      <View className="w-full mt-10 gap-3">
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            className="bg-charcoal/5 rounded-2xl h-16 w-full"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </View>

      <TouchableOpacity onPress={onCancel} className="mt-10">
        <Text
          className="text-charcoal/50 text-sm"
          style={{ fontFamily: 'Inter-Medium' }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ReviewStep({
  parsedEvent,
  onConfirm,
  isCreating,
  t,
  insets,
}: {
  parsedEvent: ParsedEventResponse;
  onConfirm: () => void;
  isCreating: boolean;
  t: (k: any, vars?: any) => string;
  insets: { bottom: number };
}) {
  const totalItems = parsedEvent.categories.reduce(
    (acc, c) => acc + c.items.length,
    0,
  );

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Event meta */}
        <View className="bg-white rounded-3xl p-5 mb-5 shadow-sm shadow-charcoal/5">
          <Text
            className="text-charcoal text-xl mb-1"
            style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
          >
            {parsedEvent.eventName}
          </Text>
          <View className="flex-row flex-wrap gap-3 mt-2">
            {parsedEvent.suggestedDate && (
              <MetaBadge icon="calendar-outline" label={parsedEvent.suggestedDate} />
            )}
            {parsedEvent.estimatedGuests != null && (
              <MetaBadge icon="people-outline" label={t('create_guests', { count: parsedEvent.estimatedGuests })} />
            )}
            <MetaBadge icon="list-outline" label={t('create_items_count', { count: totalItems })} />
          </View>
        </View>

        {/* Categories */}
        {parsedEvent.categories.map((category: ParsedCategory) => (
          <CategorySection key={category.name} category={category} />
        ))}
      </ScrollView>

      {/* Confirm button */}
      <View
        className="px-5 pt-4 bg-warmwhite border-t border-charcoal/5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          onPress={onConfirm}
          disabled={isCreating}
          className="bg-primary rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'Inter-SemiBold' }}
            >
              {t('create_confirm_btn')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetaBadge({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center bg-charcoal/5 rounded-full px-3 py-1.5 gap-1.5">
      <Ionicons name={icon} size={13} color="#44446A" />
      <Text
        className="text-charcoal/70 text-xs"
        style={{ fontFamily: 'Inter-Medium' }}
      >
        {label}
      </Text>
    </View>
  );
}

function CategorySection({ category }: { category: ParsedCategory }) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-xl">{category.emoji}</Text>
        <Text
          className="text-charcoal text-base"
          style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
        >
          {category.name}
        </Text>
        <View className="bg-charcoal/8 rounded-full px-2 py-0.5">
          <Text
            className="text-charcoal/60 text-xs"
            style={{ fontFamily: 'Inter-Medium' }}
          >
            {category.items.length}
          </Text>
        </View>
      </View>
      <View className="gap-2">
        {category.items.map((item, index) => (
          <ItemCard
            key={`${item.name}-${index}`}
            item={{
              id: `preview-${index}`,
              event_id: '',
              category: category.name as never,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes,
              is_ai_generated: true,
              created_at: '',
            }}
            preview
          />
        ))}
      </View>
    </View>
  );
}
