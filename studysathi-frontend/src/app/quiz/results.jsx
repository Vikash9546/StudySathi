import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QuizResultsScreen() {
  const { attemptId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/api/quizzes/attempt/${attemptId}/results`);
        setResults(res.data);
      } catch (err) {
        Alert.alert('Error loading results', err.message || 'Check connection');
      } finally {
        setLoading(false);
      }
    };
    if (attemptId) fetchResults();
  }, [attemptId]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getGradeColor = (grade) => {
    if (grade === 'A+' || grade === 'A') return '#22c55e';
    if (grade === 'B') return '#3b82f6';
    if (grade === 'C') return '#f59e0b';
    if (grade === 'D') return '#f97316';
    return '#ef4444';
  };

  const getStrengthColor = (strength) => {
    if (strength === 'STRONG') return '#22c55e';
    if (strength === 'AVERAGE') return '#f59e0b';
    return '#ef4444';
  };

  const getStrengthIcon = (strength) => {
    if (strength === 'STRONG') return 'checkmark-circle';
    if (strength === 'AVERAGE') return 'remove-circle';
    return 'close-circle';
  };

  const getStrengthLabel = (strength) => {
    if (strength === 'STRONG') return 'Strong';
    if (strength === 'AVERAGE') return 'Average';
    return 'Needs Work';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingTitle}>Analysing your performance...</Text>
        <Text style={styles.loadingSubtitle}>Your AI teacher is reviewing your answers</Text>
      </View>
    );
  }

  if (!results) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="warning" size={48} color={Colors.dark.error} />
        <Text style={styles.loadingTitle}>Results not found.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradeColor = getGradeColor(results.grade);
  const accuracy = Math.round(results.accuracy || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.replace('/(tabs)')}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{results.quizTitle || 'Quiz Results'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Grade + Accuracy circle ── */}
        <View style={styles.heroCard}>
          <View style={[styles.gradeCircle, { borderColor: gradeColor, shadowColor: gradeColor }]}>
            <Text style={[styles.gradeText, { color: gradeColor }]}>{results.grade}</Text>
            <Text style={styles.accuracyPct}>{accuracy}%</Text>
          </View>
          <Text style={styles.heroScore}>{results.score} / {results.totalQuestions} correct</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Ionicons name="flame" size={16} color="#f97316" />
              <Text style={styles.heroStatText}>+{results.xpEarned} XP</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Ionicons name="time-outline" size={16} color={Colors.dark.accent} />
              <Text style={styles.heroStatText}>{formatTime(results.timeTaken)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Ionicons name="trophy-outline" size={16} color="#f59e0b" />
              <Text style={styles.heroStatText}>{results.totalQuestions} Qs</Text>
            </View>
          </View>
        </View>

        {/* ── AI Teacher Summary ── */}
        {results.teacherSummary ? (
          <View style={styles.teacherCard}>
            <View style={styles.teacherHeader}>
              <View style={styles.teacherAvatar}>
                <Ionicons name="school" size={20} color={Colors.dark.accent} />
              </View>
              <View>
                <Text style={styles.teacherName}>StudySathi AI Teacher</Text>
                <Text style={styles.teacherRole}>Personalised Feedback</Text>
              </View>
            </View>
            <Text style={styles.teacherText}>{results.teacherSummary}</Text>
          </View>
        ) : null}

        {/* ── Topic Analysis ── */}
        {results.topicAnalysis && results.topicAnalysis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Topic-wise Analysis</Text>
            <Text style={styles.sectionSub}>Sorted by weakest topics first</Text>

            {results.topicAnalysis.map((t, i) => (
              <View key={i} style={styles.topicCard}>
                <View style={styles.topicRow}>
                  <Ionicons
                    name={getStrengthIcon(t.strength)}
                    size={20}
                    color={getStrengthColor(t.strength)}
                  />
                  <Text style={styles.topicName} numberOfLines={1}>{t.topic}</Text>
                  <View style={[styles.strengthBadge, { backgroundColor: getStrengthColor(t.strength) + '22', borderColor: getStrengthColor(t.strength) + '55' }]}>
                    <Text style={[styles.strengthText, { color: getStrengthColor(t.strength) }]}>
                      {getStrengthLabel(t.strength)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.topicBarBg}>
                  <View style={[styles.topicBarFill, {
                    width: `${t.accuracy}%`,
                    backgroundColor: getStrengthColor(t.strength)
                  }]} />
                </View>

                <View style={styles.topicFooter}>
                  <Text style={styles.topicScore}>{t.correct}/{t.total} correct</Text>
                  <Text style={[styles.topicPct, { color: getStrengthColor(t.strength) }]}>{t.accuracy}%</Text>
                </View>

                {/* Show wrong questions for weak topics */}
                {t.strength === 'WEAK' && t.wrongQuestions && t.wrongQuestions.length > 0 && (
                  <View style={styles.wrongQList}>
                    <Text style={styles.wrongQLabel}>Questions to revisit:</Text>
                    {t.wrongQuestions.map((q, qi) => (
                      <Text key={qi} style={styles.wrongQText} numberOfLines={2}>• {q}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Strong / Weak summary chips ── */}
        {(results.strongTopics?.length > 0 || results.weakTopics?.length > 0) && (
          <View style={styles.chipsSection}>
            {results.strongTopics?.length > 0 && (
              <View style={styles.chipGroup}>
                <Text style={styles.chipGroupLabel}>💪 Your Strengths</Text>
                <View style={styles.chipRow}>
                  {results.strongTopics.map((t, i) => (
                    <View key={i} style={[styles.chip, styles.chipStrong]}>
                      <Text style={styles.chipTextStrong}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {results.weakTopics?.length > 0 && (
              <View style={styles.chipGroup}>
                <Text style={styles.chipGroupLabel}>📌 Focus Areas</Text>
                <View style={styles.chipRow}>
                  {results.weakTopics.map((t, i) => (
                    <View key={i} style={[styles.chip, styles.chipWeak]}>
                      <Text style={styles.chipTextWeak}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Question Review toggle ── */}
        {results.answers && results.answers.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowAnswers(v => !v)}>
              <Text style={styles.toggleBtnText}>
                {showAnswers ? 'Hide' : 'Show'} Question Review
              </Text>
              <Ionicons name={showAnswers ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.dark.accent} />
            </TouchableOpacity>

            {showAnswers && results.answers.map((a, i) => (
              <View key={i} style={[styles.answerCard, a.isCorrect ? styles.answerCorrect : styles.answerWrong]}>
                <View style={styles.answerHeader}>
                  <View style={[styles.answerBadge, { backgroundColor: a.isCorrect ? '#22c55e22' : '#ef444422' }]}>
                    <Ionicons name={a.isCorrect ? 'checkmark' : 'close'} size={14} color={a.isCorrect ? '#22c55e' : '#ef4444'} />
                    <Text style={[styles.answerBadgeText, { color: a.isCorrect ? '#22c55e' : '#ef4444' }]}>
                      {a.isCorrect ? 'Correct' : 'Wrong'}
                    </Text>
                  </View>
                  {a.topic && <Text style={styles.answerTopic}>{a.topic}</Text>}
                </View>
                <Text style={styles.answerQ}>Q{i + 1}. {a.question}</Text>
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>Your answer: </Text>
                  <Text style={[styles.answerVal, { color: a.isCorrect ? '#22c55e' : '#ef4444' }]}>
                    {a.userAnswer || '(no answer)'}
                  </Text>
                </View>
                {!a.isCorrect && a.correctAnswer && (
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Correct: </Text>
                    <Text style={[styles.answerVal, { color: '#22c55e' }]}>{a.correctAnswer}</Text>
                  </View>
                )}
                {a.explanation && (
                  <Text style={styles.explanationText}>💡 {a.explanation}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Ionicons name="home-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Ionicons name="refresh" size={18} color={Colors.dark.accent} />
            <Text style={styles.secondaryBtnText}>Retake Quiz</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  scroll: { padding: 20, paddingBottom: 40 },

  loadingContainer: { flex: 1, backgroundColor: '#0d0d14', justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' },
  loadingSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8, textAlign: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 12 },

  // Hero grade card
  heroCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 28, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  gradeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 5, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  gradeText: { fontSize: 38, fontWeight: '900', lineHeight: 42 },
  accuracyPct: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  heroScore: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  heroDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Teacher card
  teacherCard: { backgroundColor: 'rgba(138,87,254,0.08)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(138,87,254,0.2)' },
  teacherHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  teacherAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(138,87,254,0.2)', justifyContent: 'center', alignItems: 'center' },
  teacherName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  teacherRole: { color: 'rgba(138,87,254,0.9)', fontSize: 11, marginTop: 2 },
  teacherText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22 },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 14 },

  // Topic card
  topicCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  topicName: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  strengthBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  strengthText: { fontSize: 11, fontWeight: '700' },
  topicBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  topicBarFill: { height: '100%', borderRadius: 3 },
  topicFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  topicScore: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  topicPct: { fontSize: 12, fontWeight: '700' },
  wrongQList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  wrongQLabel: { color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  wrongQText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18, marginBottom: 4 },

  // Chips
  chipsSection: { marginBottom: 20, gap: 16 },
  chipGroup: {},
  chipGroupLabel: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  chipStrong: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  chipWeak: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  chipTextStrong: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  chipTextWeak: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  // Toggle
  toggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  toggleBtnText: { color: Colors.dark.accent, fontSize: 14, fontWeight: '700' },

  // Answer card
  answerCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  answerCorrect: { backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.15)' },
  answerWrong: { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)' },
  answerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  answerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  answerBadgeText: { fontSize: 12, fontWeight: '700' },
  answerTopic: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  answerQ: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 10 },
  answerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  answerLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  answerVal: { fontSize: 12, fontWeight: '600' },
  explanationText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18, marginTop: 8, fontStyle: 'italic' },

  // Actions
  actions: { gap: 12, marginTop: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dark.accent, borderRadius: 14, paddingVertical: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(138,87,254,0.1)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(138,87,254,0.3)' },
  secondaryBtnText: { color: Colors.dark.accent, fontSize: 15, fontWeight: '700' },
});