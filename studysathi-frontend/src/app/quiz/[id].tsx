import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Question {
  id: string;
  question: string;
  options: string[];
  type: 'MCQ' | 'SUBJECTIVE';
}

interface Quiz {
  id: string;
  title: string;
}

export default function ActiveQuizScreen() {
  const { id: documentId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOptionText
  const [timeTaken, setTimeTaken] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const initQuiz = async () => {
      try {
        // 1. Create or get document quiz
        const quizRes: any = await api.post(
          `/api/quizzes/document/${documentId}`
        );
        const activeQuiz = quizRes.quiz;
        setQuiz(activeQuiz);
        setQuestions(quizRes.questions.filter((q: any) => q.type === 'MCQ')); // Frontend player handles MCQs

        // 2. Start attempt
        const attemptRes: any = await api.post(
          `/api/quizzes/${activeQuiz.id}/start`
        );
        setAttemptId(attemptRes.attempt.id);

        // 3. Start timer
        timerRef.current = setInterval(() => {
          setTimeTaken(prev => prev + 1);
        }, 1000);
      } catch (err: any) {
        Alert.alert('Quiz Load Failed', err.message || 'Check connection or verify AI processing completed');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    initQuiz();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [documentId]);

  const selectOption = (option: string) => {
    const currentQ = questions[currentIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: option,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    if (Object.keys(answers).length < questions.length) {
      Alert.alert(
        'Incomplete Quiz',
        'You have unanswered questions. Are you sure you want to submit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: submitQuizAnswers }
        ]
      );
    } else {
      submitQuizAnswers();
    }
  };

  const submitQuizAnswers = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const payloadAnswers = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || '',
        timeTaken: Math.round(timeTaken / questions.length),
      }));

      const res = await api.post<{ success: boolean; data: any }>(
        `/api/quizzes/attempts/${attemptId}/submit`,
        { answers: payloadAnswers }
      );

      // Route to results screen passing attempt ID
      router.replace({
        pathname: '/quiz/results',
        params: { attemptId }
      });
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Error saving answers. Please try again.');
      // Re-enable timer
      timerRef.current = setInterval(() => {
        setTimeTaken(prev => prev + 1);
      }, 1000);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Auto-Generating Quiz with AI...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.dark.error} />
        <Text style={styles.loadingText}>No MCQ questions generated for this document yet.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{quiz?.title}</Text>
        <View style={styles.timerBox}>
          <Ionicons name="time-outline" size={16} color={Colors.dark.accent} />
          <Text style={styles.timerText}>{formatTime(timeTaken)}</Text>
        </View>
      </View>

      {/* Progress tracker bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Question Panel */}
        <View style={styles.questionCard}>
          <Text style={styles.questionIndex}>Question {currentIndex + 1} of {questions.length}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Options Panel */}
        <View style={styles.optionsList}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = answers[currentQuestion.id] === option;
            const letter = ['A', 'B', 'C', 'D'][idx] || '?';
            return (
              <TouchableOpacity
                key={option}
                style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                onPress={() => selectOption(option)}
              >
                <View style={[styles.optionLetterBox, isSelected && styles.selectedLetterBox]}>
                  <Text style={[styles.optionLetterText, isSelected && styles.selectedLetterText]}>{letter}</Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer navigators */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.disabledBtn]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back" size={20} color={currentIndex === 0 ? 'rgba(255,255,255,0.1)' : '#FFF'} />
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.disabledText]}>Prev</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Quiz</Text>
                <Ionicons name="checkmark-done" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={handleNext}>
            <Text style={styles.navBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
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
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(138, 87, 254, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timerText: {
    color: Colors.dark.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.accent,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  questionIndex: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  questionText: {
    color: '#FFF',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  optionsList: {
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  selectedOptionCard: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(138, 87, 254, 0.08)',
  },
  optionLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  selectedLetterBox: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  optionLetterText: {
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  selectedLetterText: {
    color: '#FFF',
  },
  optionText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 16,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledBtn: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.03)',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.1)',
  },
  navBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.success,
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
