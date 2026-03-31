import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useItems } from '@/hooks/useItems';
import { ItemCard } from '@/components/ItemCard';
import { apiClient } from '@/lib/claude';
import { showAlert } from '@/components/Toast';
import { Category } from '@hangout/shared';
import { useT } from '@/i18n';

const CATEGORIES = Object.values(Category);

export default function ItemsManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t } = useT();

  const { data: items, isLoading } = useItems(id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>(Category.Tasks);
  const [newItemQty, setNewItemQty] = useState('');

  // AI quick-add
  const [quickAddText, setQuickAddText] = useState('');
  const quickAddRef = useRef<TextInput>(null);

  const addMutation = useMutation({
    mutationFn: () =>
      apiClient.addItem(id, {
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: newItemQty ? parseInt(newItemQty, 10) : undefined,
        is_ai_generated: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] });
      setShowAddForm(false);
      setNewItemName('');
      setNewItemQty('');
    },
    onError: (err) => {
      showAlert(t('error'), err instanceof Error ? err.message : 'Failed to add item.');
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: (text: string) => apiClient.quickAddItems(id!, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] });
      setQuickAddText('');
      queryClient.invalidateQueries({ queryKey: ['suggestions', id] });
    },
    onError: (err) => {
      showAlert(t('error'), err instanceof Error ? err.message : 'Failed to add items.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] });
    },
  });

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      showAlert(t('error'), t('profile_name_required'));
      return;
    }
    addMutation.mutate();
  };

  const handleQuickAdd = () => {
    const text = quickAddText.trim();
    if (!text) return;
    quickAddMutation.mutate(text);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        className="flex-1 bg-warmwhite"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-charcoal/5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-charcoal/8 items-center justify-center mr-4"
          >
            <Ionicons name="close" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <Text
            className="text-charcoal text-xl flex-1"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            {t('items_manage')}
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddForm(true)}
            className="flex-row items-center bg-primary rounded-xl px-3 py-2 gap-1"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text
              className="text-white text-sm"
              style={{ fontFamily: 'Inter-SemiBold' }}
            >
              {t('items_add')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add item form */}
        {showAddForm && (
          <View className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm shadow-charcoal/5">
            <Text
              className="text-charcoal text-base mb-3"
              style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
            >
              {t('items_new')}
            </Text>

            <TextInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder={t('items_name_placeholder')}
              placeholderTextColor="#9999B8"
              autoFocus
              className="bg-charcoal/5 rounded-xl px-4 py-3 text-charcoal text-base mb-3"
              style={{ fontFamily: 'Inter-Regular' }}
            />

            <View className="flex-row gap-2 mb-3">
              <TextInput
                value={newItemQty}
                onChangeText={setNewItemQty}
                placeholder={t('items_qty_placeholder')}
                placeholderTextColor="#9999B8"
                keyboardType="number-pad"
                className="bg-charcoal/5 rounded-xl px-4 py-3 text-charcoal text-base w-20"
                style={{ fontFamily: 'Inter-Regular' }}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, alignItems: 'center' }}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewItemCategory(cat)}
                    className={`px-3 py-2 rounded-xl ${
                      newItemCategory === cat ? 'bg-primary' : 'bg-charcoal/8'
                    }`}
                  >
                    <Text
                      className={`text-xs ${newItemCategory === cat ? 'text-white' : 'text-charcoal/70'}`}
                      style={{ fontFamily: 'Inter-Medium' }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => { setShowAddForm(false); setNewItemName(''); }}
                className="flex-1 py-3 border border-charcoal/10 rounded-xl items-center"
              >
                <Text className="text-charcoal/60 text-sm" style={{ fontFamily: 'Inter-Medium' }}>
                  {t('cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddItem}
                disabled={addMutation.isPending}
                className="flex-1 py-3 bg-primary rounded-xl items-center"
              >
                {addMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white text-sm" style={{ fontFamily: 'Inter-SemiBold' }}>
                    {t('add')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Items list */}
        <ScrollView
          className="flex-1 mt-4"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator color="#FF6B4A" className="mt-10" />
          ) : !items || items.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-charcoal/40 text-base" style={{ fontFamily: 'Inter-Regular' }}>
                {t('items_empty')}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  adminMode
                  onDelete={() => {
                    showAlert(t('items_delete_title'), t('items_delete_body', { name: item.name }), [
                      { text: t('cancel'), style: 'cancel' },
                      {
                        text: t('delete'),
                        style: 'destructive',
                        onPress: () => deleteMutation.mutate(item.id),
                      },
                    ]);
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* AI Quick-Add Bar */}
        <View
          style={[styles.quickAddBar, { paddingBottom: insets.bottom + 12 }]}
        >
          <View style={styles.quickAddInner}>
            <Ionicons name="sparkles" size={16} color="#FF6B4A" style={{ marginRight: 4 }} />
            <TextInput
              ref={quickAddRef}
              value={quickAddText}
              onChangeText={setQuickAddText}
              placeholder={t('items_quickadd_placeholder')}
              placeholderTextColor="#9999B8"
              style={styles.quickAddInput}
              onSubmitEditing={handleQuickAdd}
              returnKeyType="done"
              editable={!quickAddMutation.isPending}
            />
            <TouchableOpacity
              onPress={handleQuickAdd}
              disabled={!quickAddText.trim() || quickAddMutation.isPending}
              style={[
                styles.quickAddBtn,
                (!quickAddText.trim() || quickAddMutation.isPending) && { opacity: 0.4 },
              ]}
            >
              {quickAddMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  quickAddBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF8F3',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,26,46,0.06)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickAddInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1A1A2E',
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FF6B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
