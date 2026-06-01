import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.accent,
        tabBarInactiveTintColor: Colors.dark.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.dark.backgroundElement,
          borderTopColor: 'rgba(255,255,255,0.05)',
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 68
        },
        headerShown: false
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />

        }} />
      
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study Hub',
          tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />

        }} />
      
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />

        }} />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />

        }} />
      
    </Tabs>);

}