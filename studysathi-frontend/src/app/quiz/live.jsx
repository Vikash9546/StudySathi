/**
 * quiz/live.jsx
 * Re-attempt screen — accepts a pre-existing attemptId + quizId via params.
 * Reuses the same quiz questions from the quizId's attempt (adaptive + shuffled).
 */
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LiveQuizScreen() {
  const { quizId, attemptId: preloadedAttemptId, quizTitle } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(preloadedAttemptId || '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeTaken, setTimeTaken] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Start a new attempt on the quiz and fetch its questions
        if (quizId) {
          const attemptRes = await api.post(`/api/quizzes/${quizId}/reattempt`);
          const { attempt, questions: qs } = attemptRes.data;
          setAttemptId(attempt.id);
          const filtered = (qs || []).filter(
            q => q.type === 'MCQ' && Array.isArray(q.options) && q.options.length > 0
          );
          setQuestions(filtered);
          setQuiz({ id: quizId, title: quizTitle || 'Re-attempt' });
        }
      } catch (err) {
        Alert.alert('Error', err.message || 'Could not load quiz.');
        router.back();
      } finally {
        setLoading(false);
        timerRef.current = setInterval(() => setTimeTaken(t => t + 1), 1000);
      }
    };
    init();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const selectOption = (option) => {
    const q = questions[currentIndex];
    setAnswers(prev => ({ ...prev, [q.id]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert('Incomplete', 'You have unanswered questions. Submit anyway?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit Anyway', onPress: submitAnswers },
      ]);
    } else {
      submitAnswers();
    }
  };

  const submitAnswers = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const payloadAnswers = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || '',
        timeTaken: Math.round(timeTaken / questions.length),
      }));
      await api.post(`/api/quizzes/attempt/${attemptId}/submit`, { answers: payloadAnswers });
      router.replace({ pathname: '/quiz/results', params: { attemptId } });
    } catch (err) {
      Alert.alert('Submission Failed', err.message || 'Error saving answers.');
      timerRef.current = setInterval(() => setTimeTaken(t => t + 1), 1000);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Loading re-attempt...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={Colors.dark.error} />
        <Text style={styles.loadingText}>No questions available for this quiz.</Text>
        <TouchableOpacity style={styles.backBtn2} onPress={() => router.back()}>
          <Text style={styles.backBtn2Text}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{quiz?.title || quizTitle}</Text>
        <View style={styles.timerBox}>
          <Ionicons name="time-outline" size={14} color={Colors.dark.accent} />
          <Text style={styles.timerText}>{formatTime(timeTaken)}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.questionCard}>
          <Text style={styles.questionIndex}>Question {currentIndex + 1} of {questions.length}</Text>
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </View>

        <View style={styles.optionsList}>
          {(currentQ.options || []).map((option, idx) => {
            const isSelected = answers[currentQ.id] === option;
            const letter = ['A', 'B', 'C', 'D'][idx] || '?';
            return (
              <TouchableOpacity
                key={`${currentQ.id}-opt-${idx}`}
                style={[styles.optionCard, isSelected && styles.selectedOption]}
                onPress={() => selectOption(option)}
              >
                <View style={[styles.letterBox, isSelected && styles.selectedLetterBox]}>
                  <Text style={[styles.letterText, isSelected && styles.selectedLetterText]}>{letter}</Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.disabledBtn]}
          onPress={() => setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back" size={18} color={currentIndex === 0 ? 'rgba(255,255,255,0.15)' : '#fff'} />
          <Text style={[styles.navText, currentIndex === 0 && styles.disabledText]}>Prev</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.submitText}>Submit</Text>
                <Ionicons name="checkmark-done" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex(i => i + 1)}>
            <Text style={styles.navText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  center: { flex: 1, backgroundColor: '#0d0d14', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' },
  backBtn2: { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtn2Text: { color: '#fff', fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(138,87,254,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  timerText: { color: Colors.dark.accent, fontWeight: '700', fontSize: 13 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', backgroundColor: Colors.dark.accent, borderRadius: 3 },
  scroll: { padding: 20, paddingBottom: 30 },
  questionCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  questionIndex: { color: Colors.dark.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  questionText: { color: '#fff', fontSize: 17, lineHeight: 26, fontWeight: '600' },
  optionsList: { gap: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  selectedOption: { borderColor: Colors.dark.accent, backgroundColor: 'rgba(138,87,254,0.08)' },
  letterBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  selectedLetterBox: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  letterText: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 },
  selectedLetterText: { color: '#fff' },
  optionText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500', flex: 1 },
  selectedOptionText: { color: '#fff' },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  disabledBtn: { opacity: 0.3 },
  navText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  disabledText: { color: 'rgba(255,255,255,0.3)' },
  submitBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dark.success, borderRadius: 14, paddingVertical: 14 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
