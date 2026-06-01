import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QuizHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/quizzes/history');
      setHistory(res.data || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load quiz history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const handleReattempt = (item) => {
    if (!item.quizId) return Alert.alert('Error', 'Quiz not found for this attempt.');
    router.push({
      pathname: `/quiz/live`,
      params: {
        quizId: item.quizId,
        quizTitle: item.quizTitle,
      }
    });
  };

  const getGradeColor = (grade) => {
    if (grade === 'A+' || grade === 'A') return '#22c55e';
    if (grade === 'B') return '#3b82f6';
    if (grade === 'C') return '#f59e0b';
    if (grade === 'D') return '#f97316';
    return '#ef4444';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Loading quiz history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz History</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={56} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyTitle}>No Quizzes Yet</Text>
            <Text style={styles.emptySubtitle}>Complete your first quiz to see your performance history here.</Text>
          </View>
        ) : (
          <>
            {/* Summary strip */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>{history.length}</Text>
                <Text style={styles.summaryLabel}>Attempts</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  {Math.round(history.reduce((s, h) => s + (h.accuracy || 0), 0) / history.length)}%
                </Text>
                <Text style={styles.summaryLabel}>Avg Accuracy</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  +{history.reduce((s, h) => s + (h.xpEarned || 0), 0)} XP
                </Text>
                <Text style={styles.summaryLabel}>Total XP</Text>
              </View>
            </View>

            {history.map((item, i) => (
              <View key={item.attemptId || i} style={styles.card}>
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.quizTitle}</Text>
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.grade) + '22', borderColor: getGradeColor(item.grade) + '55' }]}>
                      <Text style={[styles.gradeText, { color: getGradeColor(item.grade) }]}>{item.grade}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDate}>{formatDate(item.completedAt || item.createdAt)}</Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                    <Text style={styles.statText}>{item.score}/{item.totalQuestions}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="analytics" size={14} color={Colors.dark.accent} />
                    <Text style={styles.statText}>{Math.round(item.accuracy)}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={14} color="#f59e0b" />
                    <Text style={styles.statText}>{formatTime(item.timeTaken)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="flame" size={14} color="#f97316" />
                    <Text style={styles.statText}>+{item.xpEarned} XP</Text>
                  </View>
                </View>

                {/* Accuracy bar */}
                <View style={styles.accBarBg}>
                  <View style={[styles.accBarFill, {
                    width: `${item.accuracy}%`,
                    backgroundColor: getGradeColor(item.grade)
                  }]} />
                </View>

                {/* Topic chips */}
                {(item.weakTopics?.length > 0 || item.strongTopics?.length > 0) && (
                  <View style={styles.topicChips}>
                    {item.strongTopics?.slice(0, 2).map((t, ti) => (
                      <View key={`s-${ti}`} style={styles.chipStrong}>
                        <Text style={styles.chipStrongText}>💪 {t}</Text>
                      </View>
                    ))}
                    {item.weakTopics?.slice(0, 2).map((t, ti) => (
                      <View key={`w-${ti}`} style={styles.chipWeak}>
                        <Text style={styles.chipWeakText}>📌 {t}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => router.push({ pathname: '/quiz/results', params: { attemptId: item.attemptId } })}
                  >
                    <Ionicons name="bar-chart" size={15} color={Colors.dark.accent} />
                    <Text style={styles.viewBtnText}>View Analysis</Text>
                  </TouchableOpacity>
                   <TouchableOpacity
                    style={styles.retakeBtn}
                    disabled={!item.quizId}
                    onPress={() => handleReattempt(item)}
                  >
                    <Ionicons name="refresh" size={15} color="#fff" />
                    <Text style={styles.retakeBtnText}>Re-attempt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  center: { flex: 1, backgroundColor: '#0d0d14', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scroll: { padding: 20, paddingBottom: 40, gap: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  summaryRow: { flexDirection: 'row', backgroundColor: 'rgba(138,87,254,0.08)', borderRadius: 18, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(138,87,254,0.2)', marginBottom: 6 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },

  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  gradeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  gradeText: { fontSize: 13, fontWeight: '800' },
  cardDate: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },

  accBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  accBarFill: { height: '100%', borderRadius: 3 },

  topicChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chipStrong: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  chipStrongText: { color: '#22c55e', fontSize: 11, fontWeight: '600' },
  chipWeak: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  chipWeakText: { color: '#ef4444', fontSize: 11, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 10 },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(138,87,254,0.1)', borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(138,87,254,0.25)' },
  viewBtnText: { color: Colors.dark.accent, fontSize: 13, fontWeight: '700' },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.dark.accent, borderRadius: 12, paddingVertical: 11 },
  retakeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
