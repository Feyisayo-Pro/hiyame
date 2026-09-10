import { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, Platform, OpaqueColorValue } from 'react-native';
import { useTheme } from '@/lib/theme';
import TopNav, { useIsDesktopWeb } from '@/components/TopNav';

function ProfileAvatar({ color, focused }: { color: string | OpaqueColorValue; focused: boolean }) {
  const T = useTheme();
  return (
    <View style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }, focused && { borderWidth: 1, borderColor: T.textPrimary }]}>
      <Ionicons name={focused ? 'person' : 'person-outline'} size={18} color={color} />
    </View>
  );
}

// React Navigation's bottom-tabs wraps ITS OWN label slot (tabBarLabel / the string
// `title`) in a fixed ~9px overflow:hidden box on web — a custom tabBarLabel render
// prop still gets forced into that same wrapper, so no amount of styling escapes it.
// Rendering icon+label together via tabBarIcon (a slot with no such restriction) and
// turning the built-in label off entirely (tabBarShowLabel: false) sidesteps it.
function TabIcon({ icon, label, color }: { icon: ReactNode; label: string; color: string | OpaqueColorValue }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {icon}
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.2, color }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function CandidateTabLayout() {
  const T = useTheme();
  const desktop = useIsDesktopWeb();

  return (
    <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column', backgroundColor: T.bg }}>
      <TopNav role="candidate" />
      <View style={{ flex: 1, minWidth: 0, maxWidth: desktop ? 960 : undefined }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.textPrimary,
        tabBarInactiveTintColor: T.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: desktop ? { display: 'none' } : {
          backgroundColor: T.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: T.tabBarBorder,
          shadowColor: "#0B1220",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
          height: Platform.OS === 'ios' ? 88 : Platform.OS === 'web' ? 72 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : Platform.OS === 'web' ? 14 : 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={<Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />} label="Home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={<Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} />} label="Jobs" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Connections',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={<Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />} label="Connections" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={<ProfileAvatar color={color} focused={focused} />} label="Profile" color={color} />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="verification" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="welcome-tour" options={{ href: null }} />
      </Tabs>
      </View>
    </View>
  );
}
