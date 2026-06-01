import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface QuizResultData {
  score: number;
  totalQuestions: number;
  accuracy: number;
  xpEarned: number;
  completedAt: string;
  timeTaken: number;
}

export default function QuizResultsScreen() {
  const { attemptId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResultData | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res: any = await api.get(
          `/api/quizzes/attempts/${attemptId}/results`
        );
        setResults(res.data);
      } catch (err: any) {
        Alert.alert('Error loading results', err.message || 'Check connection');
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) fetchResults();
  }, [attemptId]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Evaluating your performance...</Text>
      </View>
    );
  }

  if (!results) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="warning" size={48} color={Colors.dark.error} />
        <Text style={styles.loadingText}>Results not found.</Text>
        <TouchableOpacity style={styles.dashBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.dashBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getCelebrationMessage = (accuracy: number) => {
    if (accuracy >= 90) return { title: 'Masterful Performance!', sub: 'You have almost perfect recall!' };
    if (accuracy >= 70) return { title: 'Great Work!', sub: 'You understood the core concepts well.' };
    if (accuracy >= 50) return { title: 'Good Try!', sub: 'A bit more revision will make you perfect.' };
    return { title: 'Keep Practicing!', sub: 'Review the study notes and try again.' };
  };

  const msg = getCelebrationMessage(results.accuracy);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Celebration header */}
        <View style={styles.celebHeader}>
          <Ionicons name="sparkles" size={40} color={Colors.dark.secondaryAccent} />
          <Text style={styles.celebTitle}>{msg.title}</Text>
          <Text style={styles.celebSub}>{msg.sub}</Text>
        </View>

        {/* Circular accuracy card */}
        <View style={styles.circleContainer}>
          <View style={styles.glowCircle}>
            <Text style={styles.accuracyNumber}>{Math.round(results.accuracy)}%</Text>
            <Text style={styles.accuracyLabel}>ACCURACY</Text>
          </View>
        </View>

        {/* Statistics grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color={Colors.dark.secondaryAccent} />
            <Text style={styles.statVal}>+{results.xpEarned} XP</Text>
            <Text style={styles.statLabel}>XP Earned</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.dark.success} />
            <Text style={styles.statVal}>{results.score} / {results.totalQuestions}</Text>
            <Text style={styles.statLabel}>Score</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="hourglass" size={24} color={Colors.dark.accent} />
            <Text style={styles.statVal}>{formatTime(results.timeTaken)}</Text>
            <Text style={styles.statLabel}>Time Taken</Text>
          </View>
        </View>

        {/* Action controllers */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.dashBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.dashBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 16,
    fontSize: 15,
  },
  scrollContainer: {
    padding: 24,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  celebHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  celebTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  celebSub: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  glowCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 6,
    borderColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  accuracyNumber: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  accuracyLabel: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  footerActions: {
    width: '100%',
  },
  dashBtn: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  dashBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
