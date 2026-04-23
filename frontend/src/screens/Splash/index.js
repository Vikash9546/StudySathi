import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Share2 } from 'lucide-react-native'; // Closest to the logo icon
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';

export const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        useNativeDriver: true,
      })
    ]).start();

    // Custom splash delay to match UI transition
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.content, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}>
        <View style={styles.logoContainer}>
          <Share2 size={60} color={theme.colors.textPrimary} strokeWidth={2.5} />
        </View>
        
        <Typography variant="h1" style={styles.title}>StudySathi</Typography>
        <Typography variant="tiny" style={styles.subtitle}>DIGITAL LIBRARY</Typography>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <Typography variant="tiny" color={theme.colors.textMuted}>
          Initializing Academic Environment
        </Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  title: {
    letterSpacing: -1,
    fontWeight: '800',
  },
  subtitle: {
    letterSpacing: 4,
    marginTop: 4,
    color: theme.colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  progressBar: {
    width: 40,
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: theme.colors.textPrimary,
  }
});
