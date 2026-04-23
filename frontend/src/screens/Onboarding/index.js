import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Brain, Share2, Timer, BookOpen } from 'lucide-react-native';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    title: 'AI Recall',
    desc: 'Automated spaced-repetition schedules generated from your unique content.',
    icon: Brain
  },
  {
    title: 'Deep Context',
    desc: 'Map connections between different subjects to build a holistic mental model.',
    icon: Share2
  },
  {
    title: 'Focus Engine',
    desc: 'Minimalist interface designed specifically to minimize cognitive friction.',
    icon: Timer
  }
];

export const OnboardingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <View style={styles.logoRow}>
          <BookOpen size={20} color={theme.colors.textPrimary} />
          <Typography variant="bodyBold" style={{ marginLeft: 8, letterSpacing: 1 }}>STUDYSATHI</Typography>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
          <Typography variant="caption" color={theme.colors.textMuted}>Sign In</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroImageContainer}>
          {/* Mockup of the study notes illustration from UI */}
          <View style={styles.heroIllustration}>
            <View style={[styles.docCard, { transform: [{ rotate: '-10deg' }] }]} />
            <View style={[styles.docCard, { transform: [{ rotate: '10deg' }], left: 60, top: 20 }]} />
            <Share2 size={40} color={theme.colors.textPrimary} style={styles.heroIcon} />
          </View>
        </View>

        <View style={styles.heroText}>
          <Typography variant="h1" style={styles.mainTitle}>
            Turn notes into <Typography variant="h1" style={styles.underline}>memory</Typography> in seconds
          </Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.description}>
            Synapse uses advanced cognitive mapping to transform your lecture notes into structured study clusters.
          </Typography>
        </View>

        <View style={styles.actionSection}>
          <Button 
            title="Get Started" 
            onPress={() => navigation.navigate('Auth')} 
            icon={() => <ArrowRight size={20} color={theme.colors.white} />}
            style={styles.getStartedBtn}
          />
          <Typography variant="tiny" color={theme.colors.textMuted} style={styles.footerText}>
            Free for students. No credit card required.
          </Typography>
        </View>

        <View style={styles.featuresList}>
          {FEATURES.map((feat, i) => (
            <Card key={i} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <feat.icon size={20} color={theme.colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="h3" style={{ marginBottom: 4 }}>{feat.title}</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  {feat.desc}
                </Typography>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.legalFooter}>
          <Typography variant="tiny" color={theme.colors.textMuted}>
            © 2024 StudySathi Academic. Built for Deep Work.
          </Typography>
          <View style={styles.legalLinks}>
            <Typography variant="tiny" color={theme.colors.textMuted}>Privacy</Typography>
            <Typography variant="tiny" color={theme.colors.textMuted}>Terms</Typography>
            <Typography variant="tiny" color={theme.colors.textMuted}>Help</Typography>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: theme.spacing.lg,
  },
  heroImageContainer: {
    height: 240,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIllustration: {
    width: 200,
    height: 150,
  },
  docCard: {
    width: 80,
    height: 110,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroIcon: {
    position: 'absolute',
    alignSelf: 'center',
    top: 40,
  },
  heroText: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  getStartedBtn: {
    width: '100%',
    height: 60,
    borderRadius: 12,
  },
  footerText: {
    marginTop: 12,
  },
  featuresList: {
    gap: 16,
    marginBottom: 60,
  },
  featureCard: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: 16,
    borderWidth: 0,
    backgroundColor: theme.colors.surface,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalFooter: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  legalLinks: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  }
});
