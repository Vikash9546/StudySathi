import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSocket, disconnectSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';








const BATTLE_QUESTIONS = [
{
  id: 'q1',
  question: 'Which of the following data structures operates on a Last In First Out (LIFO) model?',
  options: ['Queue', 'Linked List', 'Stack', 'Binary Tree'],
  answer: 'Stack'
},
{
  id: 'q2',
  question: 'What is the time complexity of searching in a balanced Binary Search Tree (BST)?',
  options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
  answer: 'O(log n)'
},
{
  id: 'q3',
  question: 'Which HTTP method is designed to be idempotent for updating resources?',
  options: ['POST', 'PUT', 'GET', 'DELETE'],
  answer: 'PUT'
},
{
  id: 'q4',
  question: 'In databases, what does the ACID model stand for?',
  options: [
  'Atomicity, Consistency, Isolation, Durability',
  'Access, Control, Indexing, Delivery',
  'Audit, Cache, Integrity, Distribution',
  'Availability, Clustering, Integration, Deletion'],

  answer: 'Atomicity, Consistency, Isolation, Durability'
},
{
  id: 'q5',
  question: 'Which layer of the OSI model manages route path calculations and network packets?',
  options: ['Data Link Layer', 'Transport Layer', 'Network Layer', 'Session Layer'],
  answer: 'Network Layer'
}];


export default function BattleArenaScreen() {
  const { challengeId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);

  // Real-time states
  const [scores, setScores] = useState({});
  const [opponentId, setOpponentId] = useState('');
  const [winnerId, setWinnerId] = useState(null);
  const [battleEnded, setBattleEnded] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Time metrics
  const [timer, setTimer] = useState(15); // 15 seconds per question
  const questionTimerRef = useRef(null);

  useEffect(() => {
    let socket;

    const setupSocket = async () => {
      try {
        socket = await getSocket();
        setSocketConnected(true);

        // Listen for live score updates
        socket.on('battle:score_update', (data) => {
          setScores(data.scores);
          // Auto-detect opponent ID
          const oId = Object.keys(data.scores).find((id) => id !== user?.id);
          if (oId) setOpponentId(oId);
        });

        // Listen for battle completion announcement
        socket.on('battle:ended', (data) => {
          setWinnerId(data.winnerId);
          setBattleEnded(true);
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        });
      } catch (err) {
        Alert.alert('Connection Lost', 'Could not establish real-time connection');
        router.replace('/battle/lobby');
      }
    };

    setupSocket();

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (socket) {
        socket.off('battle:score_update');
        socket.off('battle:ended');
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    setTimer(15);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current);
          handleNextQuestion(null); // Time out - select nothing
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex]);

  const handleSelectOption = async (option) => {
    if (selectedAns !== null) return; // Answer locked
    setSelectedAns(option);

    const activeQ = BATTLE_QUESTIONS[currentIndex];
    const isCorrect = option === activeQ.answer;

    try {
      const socket = await getSocket();
      socket.emit('battle:answer', {
        challengeId,
        questionId: activeQ.id,
        isCorrect
      });
    } catch {}

    // Short delay to show correct/incorrect selection before loading next question
    setTimeout(() => {
      handleNextQuestion(option);
    }, 1200);
  };

  const handleNextQuestion = async (lastAns) => {
    setSelectedAns(null);
    if (currentIndex < BATTLE_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed final question - tell server to finish battle
      try {
        if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        const socket = await getSocket();
        socket.emit('battle:finish', { challengeId });
      } catch {}
    }
  };

  const getOpponentScore = () => {
    if (!opponentId) return 0;
    return scores[opponentId] ?? 0;
  };

  const getUserScore = () => {
    if (!user) return 0;
    return scores[user.id] ?? 0;
  };

  if (!socketConnected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Connecting to Arena...</Text>
      </View>);

  }

  const activeQ = BATTLE_QUESTIONS[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Score header bar */}
      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreName}>You</Text>
          <Text style={styles.scoreVal}>{getUserScore()} Correct</Text>
        </View>
        
        <View style={styles.timerDisplay}>
          <Text style={styles.timerVal}>{timer}s</Text>
        </View>

        <View style={[styles.scoreItem, { alignItems: 'flex-end' }]}>
          <Text style={styles.scoreName}>Opponent</Text>
          <Text style={[styles.scoreVal, { color: Colors.dark.secondaryAccent }]}>{getOpponentScore()} Correct</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Question Panel */}
        <View style={styles.questionCard}>
          <Text style={styles.questionMeta}>Question {currentIndex + 1} of {BATTLE_QUESTIONS.length}</Text>
          <Text style={styles.questionText}>{activeQ.question}</Text>
        </View>

        {/* Options Panel */}
        <View style={styles.optionsList}>
          {activeQ.options.map((option, idx) => {
            const isSelected = selectedAns === option;
            const isCorrectOption = option === activeQ.answer;
            const isIncorrectSelection = isSelected && !isCorrectOption;

            let cardStyle = styles.optionCard;
            let letterBoxStyle = styles.optionLetterBox;
            let textStyle = styles.optionText;

            if (selectedAns !== null) {
              if (isCorrectOption) {
                cardStyle = [styles.optionCard, styles.correctCard];
                letterBoxStyle = [styles.optionLetterBox, styles.correctLetterBox];
                textStyle = [styles.optionText, styles.correctText];
              } else if (isIncorrectSelection) {
                cardStyle = [styles.optionCard, styles.incorrectCard];
                letterBoxStyle = [styles.optionLetterBox, styles.incorrectLetterBox];
                textStyle = [styles.optionText, styles.incorrectText];
              }
            }

            const letter = ['A', 'B', 'C', 'D'][idx] || '?';

            return (
              <TouchableOpacity
                key={option}
                style={cardStyle}
                onPress={() => handleSelectOption(option)}
                disabled={selectedAns !== null}>
                
                <View style={letterBoxStyle}>
                  <Text style={styles.optionLetterText}>{letter}</Text>
                </View>
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>);

          })}
        </View>
      </ScrollView>

      {/* Battle End Winner modal popup */}
      {battleEnded &&
      <View style={styles.overlayModal}>
          <View style={styles.winnerCard}>
            <View style={styles.winnerIcon}>
              <Ionicons
              name={winnerId === user?.id ? 'trophy' : 'sad'}
              size={54}
              color={winnerId === user?.id ? Colors.dark.accent : Colors.dark.textSecondary} />
            
            </View>
            <Text style={styles.winnerTitle}>
              {winnerId === user?.id ? 'Victory!' : 'Defeat!'}
            </Text>
            <Text style={styles.winnerSub}>
              {winnerId === user?.id ?
            'Excellent work! You answered faster and earned 2x XP rewards!' :
            'Nice attempt! Practice makes perfect.'}
            </Text>

            <View style={styles.scoresSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Your Score:</Text>
                <Text style={styles.summaryVal}>{getUserScore()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Opponent Score:</Text>
                <Text style={styles.summaryVal}>{getOpponentScore()}</Text>
              </View>
            </View>

            <TouchableOpacity
            style={styles.lobbyReturnBtn}
            onPress={() => {
              disconnectSocket();
              router.replace('/(tabs)');
            }}>
            
              <Text style={styles.lobbyReturnText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 16,
    fontSize: 15
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  scoreItem: {
    flex: 1.2
  },
  scoreName: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  scoreVal: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4
  },
  timerDisplay: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  timerVal: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40
  },
  questionCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24
  },
  questionMeta: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12
  },
  questionText: {
    color: '#FFF',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600'
  },
  optionsList: {
    gap: 14
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
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
    borderColor: 'rgba(255,255,255,0.05)'
  },
  optionLetterText: {
    color: '#FFF',
    fontWeight: '700'
  },
  optionText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1
  },
  correctCard: {
    borderColor: Colors.dark.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)'
  },
  correctLetterBox: {
    backgroundColor: Colors.dark.success,
    borderColor: Colors.dark.success
  },
  correctText: {
    color: '#FFF',
    fontWeight: '600'
  },
  incorrectCard: {
    borderColor: Colors.dark.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)'
  },
  incorrectLetterBox: {
    backgroundColor: Colors.dark.error,
    borderColor: Colors.dark.error
  },
  incorrectText: {
    color: '#FFF',
    fontWeight: '600'
  },
  overlayModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  winnerCard: {
    width: '100%',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center'
  },
  winnerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  winnerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  winnerSub: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28
  },
  scoresSummary: {
    width: '100%',
    backgroundColor: Colors.dark.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  summaryLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14
  },
  summaryVal: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  lobbyReturnBtn: {
    backgroundColor: Colors.dark.accent,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  lobbyReturnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});