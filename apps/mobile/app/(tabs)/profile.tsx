import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
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

  const menuItems: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; destructive?: boolean }> = [
    {
      icon: 'notifications-outline',
      label: 'Notification preferences',
      onPress: () => Alert.alert('Coming soon', 'Notification settings coming soon.'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy',
      onPress: () => Alert.alert('Coming soon', 'Privacy settings coming soon.'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Feedback',
      onPress: () => Alert.alert('Coming soon', 'Help center coming soon.'),
    },
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
            onPress={() => Alert.alert('Coming soon', 'Profile editing coming soon.')}
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
    </View>
  );
}
