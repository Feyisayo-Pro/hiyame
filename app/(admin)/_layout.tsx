import { Tabs } from 'expo-router';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { Text, View, Platform, OpaqueColorValue } from 'react-native';
import { useTheme, fontFamilyForWeight } from '@/lib/theme';
import TopNav, { useIsDesktopWeb } from '@/components/TopNav';

// Same TabIcon workaround as (candidate)/_layout.tsx and (company)/_layout.tsx
// — see that file's own comment for why icon+label render through
// tabBarIcon instead of the built-in label slot.
function TabIcon({ name, label, color }: { name: AppIconName; label: string; color: string | OpaqueColorValue }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <AppIcon name={name} size={22} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.2, color, fontFamily: fontFamilyForWeight('700') }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function AdminTabLayout() {
  const T = useTheme();
  const desktop = useIsDesktopWeb();

  return (
    <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column', backgroundColor: T.bg }}>
      <TopNav role="admin" />
      <View style={{ flex: 1, minWidth: 0, paddingTop: desktop ? 16 : 0 }}>
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
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} label="Overview" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="candidates"
        options={{
          title: 'Candidates',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} label="Candidates" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          title: 'Companies',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'business' : 'business-outline'} label="Companies" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="interviews"
        options={{
          title: 'Interviews',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" label="Interviews" color={color} />
          ),
        }}
      />
      </Tabs>
      </View>
    </View>
  );
}
