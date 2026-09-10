import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, Platform, OpaqueColorValue } from 'react-native';
import { useTheme } from '@/lib/theme';
import TopNav, { useIsDesktopWeb } from '@/components/TopNav';

// React Navigation's bottom-tabs wraps ITS OWN label slot (tabBarLabel / the string
// `title`) in a fixed ~9px overflow:hidden box on web — a custom tabBarLabel render
// prop still gets forced into that same wrapper, so no amount of styling escapes it.
// Rendering icon+label together via tabBarIcon (a slot with no such restriction) and
// turning the built-in label off entirely (tabBarShowLabel: false) sidesteps it.
function TabIcon({ name, label, color }: { name: keyof typeof Ionicons.glyphMap; label: string; color: string | OpaqueColorValue }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Ionicons name={name} size={22} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.2, color }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function CompanyTabLayout() {
  const T = useTheme();
  const desktop = useIsDesktopWeb();

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <TopNav role="company" />
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
            <TabIcon name={focused ? 'home' : 'home-outline'} label="Home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roles"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} label="Discover" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Connections',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} label="Connections" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} label="Insights" color={color} />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="shortlist" options={{ href: null }} />
      <Tabs.Screen name="create-role" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
