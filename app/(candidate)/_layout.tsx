import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, OpaqueColorValue } from 'react-native';
import { useTheme, ThemePalette } from '@/lib/theme';

function ProfileAvatar({ color, focused }: { color: string | OpaqueColorValue; focused: boolean }) {
  const T = useTheme();
  return (
    <View style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }, focused && { borderWidth: 1, borderColor: T.textPrimary }]}>
      <Ionicons name={focused ? 'person' : 'person-outline'} size={18} color={color} />
    </View>
  );
}

export default function CandidateTabLayout() {
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
        name="opportunities"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} />
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <ProfileAvatar color={color} focused={focused} />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="verification" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="role/[id]" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
