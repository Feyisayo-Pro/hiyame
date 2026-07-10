import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, OpaqueColorValue } from 'react-native';
import { useTheme, ThemePalette } from '@/lib/theme';

export default function CompanyTabLayout() {
  const T = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.textPrimary,
        tabBarInactiveTintColor: T.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: T.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: T.tabBarBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 12,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roles"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="shortlist" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="role/[id]" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}
