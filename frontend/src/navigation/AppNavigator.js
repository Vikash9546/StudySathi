import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import { theme } from '../theme';

import { SplashScreen } from '../screens/Splash';
import { OnboardingScreen } from '../screens/Onboarding';
import { HomeScreen } from '../screens/Home';
import { UploadScreen } from '../screens/Upload';
import { ProcessingScreen } from '../screens/Processing';
import { StudySetScreen } from '../screens/StudySet';

// Explicitly disable native screens to bypass Fabric bridge type errors
enableScreens(false);

const Stack = createStackNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background }
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Upload" component={UploadScreen} />
        <Stack.Screen name="Processing" component={ProcessingScreen} />
        <Stack.Screen name="StudySet" component={StudySetScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
