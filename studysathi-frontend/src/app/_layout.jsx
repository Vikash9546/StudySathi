import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { Colors } from '../constants/theme';

function NavigationWrapper() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('[NavigationWrapper] useEffect triggered - loading:', loading, 'user:', JSON.stringify(user));
    if (!loading) {
      if (!user) {
        console.log('[NavigationWrapper] Redirecting to login because user is null');
        router.replace('/(auth)/login');
      } else if (!user.examGoal) {
        console.log('[NavigationWrapper] Redirecting to onboarding because user.examGoal is falsy:', user.examGoal);
        router.replace('/(auth)/onboarding');
      } else {
        console.log('[NavigationWrapper] Redirecting to tabs because user has examGoal:', user.examGoal);
        router.replace('/(tabs)');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>);

  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(auth)/onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="quiz/[id]" />
      <Stack.Screen name="quiz/results" />
      <Stack.Screen name="quiz/history" />
      <Stack.Screen name="quiz/live" />
      <Stack.Screen name="flashcard/[docId]" />
      <Stack.Screen name="tutor/chat" />
      <Stack.Screen name="notes/[docId]" />
      <Stack.Screen name="battle/lobby" />
      <Stack.Screen name="battle/arena" />
      <Stack.Screen name="planner/weekly" />
    </Stack>);

}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <StatusBar style="light" />
        <NavigationWrapper />
      </AuthProvider>
    </ThemeProvider>);

}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center'
  }
});