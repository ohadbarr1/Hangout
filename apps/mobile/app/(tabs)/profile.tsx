import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/components/Toast';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleSignOut = () => {
    showAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    setNewName(user?.name ?? '');
    setEditModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert('Name required', 'Please enter a display name.');
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (error) throw error;
      if (user) {
        setUser({ ...user, name: trimmed });
      }
      setEditModalVisible(false);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const menuItems: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; destructive?: boolean }> = [
    {
      icon: 'log-out-outline',
      label: 'Sign out',
      onPress: handleSignOut,
      destructive: true,
    },
  ];

  return (
    <View
      className="flex-1 bg-warmwhite"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text
            className="text-charcoal text-2xl"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            Profile
          </Text>
        </View>

        {/* Avatar + name card */}
        <View className="mx-5 bg-white rounded-3xl p-6 items-center shadow-sm shadow-charcoal/5">
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              className="w-20 h-20 rounded-full mb-4"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-primary/15 items-center justify-center mb-4">
              <Text
                className="text-primary text-3xl"
                style={{ fontFamily: 'PlusJakartaSans-Bold' }}
              >
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
          )}

          <Text
            className="text-charcoal text-xl mb-1"
            style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
          >
            {user?.name ?? 'Anonymous'}
          </Text>
          <Text
            className="text-charcoal/50 text-sm"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            {user?.email ?? ''}
          </Text>

          <TouchableOpacity
            className="mt-4 border border-primary/30 rounded-xl px-5 py-2.5"
            onPress={handleEditProfile}
          >
            <Text
              className="text-primary text-sm"
              style={{ fontFamily: 'Inter-Medium' }}
            >
              Edit profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <View className="mx-5 mt-5 bg-white rounded-3xl overflow-hidden shadow-sm shadow-charcoal/5">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center px-5 py-4 ${
                index < menuItems.length - 1 ? 'border-b border-charcoal/5' : ''
              }`}
              activeOpacity={0.7}
            >
              <View className="w-9 h-9 rounded-xl bg-charcoal/5 items-center justify-center mr-4">
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.destructive ? '#EF4444' : '#1A1A2E'}
                />
              </View>
              <Text
                className={`flex-1 text-base ${item.destructive ? 'text-red-500' : 'text-charcoal'}`}
                style={{ fontFamily: 'Inter-Regular' }}
              >
                {item.label}
              </Text>
              {!item.destructive && (
                <Ionicons name="chevron-forward" size={16} color="#9999B8" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* App version */}
        <Text
          className="text-charcoal/30 text-xs text-center mt-8"
          style={{ fontFamily: 'Inter-Regular' }}
        >
          Hangout v1.0.0
        </Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text
              className="text-charcoal text-lg mb-5"
              style={{ fontFamily: 'PlusJakartaSans-Bold' }}
            >
              Edit Profile
            </Text>

            <Text
              className="text-charcoal/70 text-sm mb-2"
              style={{ fontFamily: 'Inter-Medium' }}
            >
              Display name
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Your name"
              placeholderTextColor="#9999B8"
              autoCapitalize="words"
              className="bg-warmwhite border border-charcoal/10 rounded-2xl px-4 py-4 text-charcoal text-base mb-6"
              style={{ fontFamily: 'Inter-Regular' }}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="flex-1 rounded-2xl py-3.5 items-center border border-charcoal/10"
                disabled={savingName}
              >
                <Text
                  className="text-charcoal/70 text-base"
                  style={{ fontFamily: 'Inter-Medium' }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                disabled={savingName}
                className="flex-1 rounded-2xl py-3.5 items-center bg-primary"
                style={{ opacity: savingName ? 0.6 : 1 }}
              >
                {savingName ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className="text-white text-base"
                    style={{ fontFamily: 'Inter-SemiBold' }}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
