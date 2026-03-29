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
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useItems } from '@/hooks/useItems';
import { ItemCard } from '@/components/ItemCard';
import { apiClient } from '@/lib/claude';
import { showAlert } from '@/components/Toast';
import { Category } from '@hangout/shared';

const CATEGORIES = Object.values(Category);

export default function ItemsManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useItems(id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>(Category.Tasks);
  const [newItemQty, setNewItemQty] = useState('');

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
      showAlert('Error', err instanceof Error ? err.message : 'Failed to add item.');
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
      showAlert('Name required', 'Enter a name for the item.');
      return;
    }
    addMutation.mutate();
  };

  return (
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
          Manage items
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
            Add item
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
            New item
          </Text>

          <TextInput
            value={newItemName}
            onChangeText={setNewItemName}
            placeholder="Item name"
            placeholderTextColor="#9999B8"
            autoFocus
            className="bg-charcoal/5 rounded-xl px-4 py-3 text-charcoal text-base mb-3"
            style={{ fontFamily: 'Inter-Regular' }}
          />

          <View className="flex-row gap-2 mb-3">
            <TextInput
              value={newItemQty}
              onChangeText={setNewItemQty}
              placeholder="Qty"
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
                Cancel
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
                  Add
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Items list */}
      <ScrollView
        className="flex-1 mt-4"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color="#FF6B4A" className="mt-10" />
        ) : !items || items.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-charcoal/40 text-base" style={{ fontFamily: 'Inter-Regular' }}>
              No items yet. Add your first one.
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
                  showAlert('Delete item', `Remove "${item.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
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
    </View>
  );
}
