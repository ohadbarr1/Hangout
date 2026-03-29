import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-warmwhite items-center justify-center px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>

      <Text
        className="text-charcoal text-3xl mb-3 text-center"
        style={{ fontFamily: 'PlusJakartaSans-Bold' }}
      >
        Page not found
      </Text>

      <Text
        className="text-charcoal/60 text-base text-center mb-8 leading-6"
        style={{ fontFamily: 'Inter-Regular' }}
      >
        The page you're looking for doesn't exist or has been moved.
      </Text>

      <TouchableOpacity
        onPress={() => router.replace('/(tabs)/')}
        className="bg-primary rounded-2xl px-8 py-4"
        activeOpacity={0.85}
      >
        <Text
          className="text-white text-base"
          style={{ fontFamily: 'Inter-SemiBold' }}
        >
          Go home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
