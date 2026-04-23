import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Loader, Circle, Sparkles, BookOpen } from 'lucide-react-native';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Card } from '../../components/Card';

const STEPS = [
  { id: 'ingestion', label: 'DATA INGESTION', status: 'complete' },
  { id: 'synthesis', label: 'KNOWLEDGE SYNTHESIS', status: 'processing' },
  { id: 'generation', label: 'ASSET GENERATION', status: 'queued' },
];

export const ProcessingScreen = ({ navigation, route }) => {
  const { fileName } = route.params;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <View style={styles.logoRow}>
          <BookOpen size={20} color={theme.colors.textPrimary} />
          <Typography variant="bodyBold" style={{ marginLeft: 8, letterSpacing: 1 }}>STUDYSATHI</Typography>
        </View>
        <View style={styles.avatarCircle} />
      </View>

      <View style={styles.content}>
        <View style={styles.visualizer}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <View style={styles.dot} />
          </Animated.View>
          <View style={styles.iconBox}>
             <Sparkles size={40} color={theme.colors.textPrimary} />
          </View>
        </View>

        <Typography variant="h2" style={styles.title}>Understanding your notes...</Typography>
        <Typography variant="body" color={theme.colors.textSecondary} style={styles.desc}>
          StudySathi AI is extracting key concepts and identifying structural hierarchies within your lecture material.
        </Typography>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <Card key={step.id} style={[styles.stepCard, step.status === 'queued' && styles.queuedStep]}>
              <View style={styles.stepRow}>
                {step.status === 'complete' && <CheckCircle size={20} color={theme.colors.textPrimary} />}
                {step.status === 'processing' && <Loader size={20} color={theme.colors.textPrimary} />}
                {step.status === 'queued' && <Circle size={20} color={theme.colors.textMuted} />}
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="tiny" style={{ fontWeight: '700' }} color={step.status === 'queued' ? theme.colors.textMuted : theme.colors.textPrimary}>
                    {step.label}
                  </Typography>
                </View>
                
                <Typography variant="tiny" color={step.status === 'queued' ? theme.colors.textMuted : theme.colors.textPrimary}>
                  {step.status.toUpperCase()}
                </Typography>
              </View>
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressFill, 
                  { width: step.status === 'complete' ? '100%' : step.status === 'processing' ? '65%' : '0%' }
                ]} />
              </View>
            </Card>
          ))}
        </View>

        <Card style={styles.tipCard}>
           <View style={styles.tipIcon}>
              <Typography variant="tiny" style={{ fontWeight: '900', color: theme.colors.white }}>TIP</Typography>
           </View>
           <View style={{ flex: 1 }}>
              <Typography variant="tiny" style={{ fontWeight: '800', marginBottom: 4 }}>STUDY TIP</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>
                Active recall is 50% more effective when paired with spaced repetition. Your new flashcards will be optimized for this technique.
              </Typography>
           </View>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
  },
  content: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    flex: 1,
  },
  visualizer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  spinner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'absolute',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    top: -4,
  },
  iconBox: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  desc: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  steps: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  },
  stepCard: {
    padding: 16,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  queuedStep: {
    opacity: 0.5,
    backgroundColor: theme.colors.surface,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
    gap: 16,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
