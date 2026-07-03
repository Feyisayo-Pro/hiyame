import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function CompanyTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'square.grid.2x2', android: 'dashboard', web: 'dashboard' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="roles"
        options={{
          title: 'Roles',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'briefcase', android: 'work', web: 'work' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shortlist"
        options={{
          title: 'Shortlist',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.2', android: 'group', web: 'group' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
