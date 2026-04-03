import { Tabs } from 'expo-router';
import { Platform, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

const TAB_CONFIG: Record<string, { active: string; inactive: string }> = {
  index:       { active: 'home',     inactive: 'home-outline' },
  'my-events': { active: 'calendar', inactive: 'calendar-outline' },
  profile:     { active: 'person',   inactive: 'person-outline' },
};

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={[styles.container, { bottom: isWeb ? 20 : Math.max(insets.bottom, 8) + 12 }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_CONFIG[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

          const onPress = () => {
            if (isFocused) return;
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={[styles.tab, isFocused && styles.tabActive]}
            >
              <Ionicons
                name={(isFocused ? icons.active : icons.inactive) as keyof typeof Ionicons.glyphMap}
                size={22}
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.38)'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Home' }} />
      <Tabs.Screen name="my-events" options={{ title: 'Events' }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 28,
    right: 28,
    alignItems: 'stretch',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderRadius: 32,
    padding: 6,
    gap: 4,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 28,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 26,
  },
  tabActive: {
    backgroundColor: '#FF6B4A',
    shadowColor: '#FF6B4A',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
