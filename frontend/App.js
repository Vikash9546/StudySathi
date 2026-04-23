import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/screens/Splash';
import { OnboardingScreen } from './src/screens/Onboarding';
import { AuthScreen } from './src/screens/Auth';
import { HomeScreen } from './src/screens/Home';
import { UploadScreen } from './src/screens/Upload';
import { ProcessingScreen } from './src/screens/Processing';
import { StudySetScreen } from './src/screens/StudySet';
import { ProfileScreen } from './src/screens/Profile';
import { theme } from './src/theme';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Splash');
  const [screenParams, setScreenParams] = useState({});

  const navigate = (screen, params = {}) => {
    setScreenParams(params);
    setCurrentScreen(screen);
  };

  const replace = (screen, params = {}) => {
    setScreenParams(params);
    setCurrentScreen(screen);
  };

  const navigationProxy = {
    navigate,
    replace,
    goBack: () => setCurrentScreen('Home'),
  };

  let ScreenComponent;
  switch (currentScreen) {
    case 'Splash': ScreenComponent = SplashScreen; break;
    case 'Onboarding': ScreenComponent = OnboardingScreen; break;
    case 'Auth': ScreenComponent = AuthScreen; break;
    case 'Home': ScreenComponent = HomeScreen; break;
    case 'Upload': ScreenComponent = UploadScreen; break;
    case 'Processing': ScreenComponent = ProcessingScreen; break;
    case 'StudySet': ScreenComponent = StudySetScreen; break;
    case 'Profile': ScreenComponent = ProfileScreen; break;
    default: ScreenComponent = HomeScreen;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenComponent navigation={navigationProxy} route={{ params: screenParams }} />
      </View>
    </SafeAreaProvider>
  );
}
