import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type TabIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

function HomeIcon({ color, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'home' : 'home-outline'}
      size={24}
      color={color}
    />
  );
}

function EventsIcon({ color, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'calendar' : 'calendar-outline'}
      size={24}
      color={color}
    />
  );
}

function ProfileIcon({ color, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'person' : 'person-outline'}
      size={24}
      color={color}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B4A',
        tabBarInactiveTintColor: '#9999B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#1A1A2E',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="my-events"
        options={{
          title: 'My Events',
          tabBarIcon: EventsIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tabs>
  );
}
