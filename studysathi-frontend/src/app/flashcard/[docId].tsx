import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Animated, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  type: string;
  topic: string;
}

export default function FlashcardScreen() {
  const { docId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Animated values
  const animatedValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(0)).current; // For card transitions

  // Flip Interpolation
  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const res: any = await api.get('/api/flashcards/due');
        // Filter flashcards by docId if needed, otherwise show all due cards
        setFlashcards(res.data);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load flashcards');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchFlashcards();
  }, [docId]);

  const flipCard = () => {
    if (isFlipped) {
      // Flip back to front
      Animated.spring(animatedValue, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      // Flip to back
      Animated.spring(animatedValue, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
  };

  const handleReview = async (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (submitting) return;
    setSubmitting(true);
    const activeCard = flashcards[currentIndex];

    try {
      await api.post(`/api/flashcards/${activeCard.id}/review`, { rating });

      // Slide card out to the side
      Animated.timing(slideValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Increment Index
        if (currentIndex < flashcards.length - 1) {
          // Reset flip state silently before rendering next card
          animatedValue.setValue(0);
          setIsFlipped(false);
          setCurrentIndex(prev => prev + 1);
          // Slide new card back in
          slideValue.setValue(0);
        } else {
          Alert.alert('Review Complete!', 'You have reviewed all due flashcards.', [
            { text: 'Okay', onPress: () => router.replace('/(tabs)/study') }
          ]);
        }
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Fetching Review Deck...</Text>
      </View>
    );
  }

  if (flashcards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sparkles" size={48} color={Colors.dark.accent} />
        <Text style={styles.loadingText}>All caught up! No due flashcards for today.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeCard = flashcards[currentIndex];
  
  // Card slide animation values
  const cardTranslateX = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -400], // Slide to left
  });
  const cardOpacity = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flashcards Review</Text>
        <Text style={styles.countText}>{currentIndex + 1} / {flashcards.length}</Text>
      </View>

      <View style={styles.cardArea}>
        {/* Animated Flashcard Container */}
        <Animated.View style={[
          styles.animatedCardContainer,
          { transform: [{ translateX: cardTranslateX }], opacity: cardOpacity }
        ]}>
          <TouchableOpacity activeOpacity={0.95} onPress={flipCard} style={styles.touchableCard}>
            {/* Front of Card */}
            <Animated.View style={[styles.cardFace, styles.cardFront, { transform: [{ rotateY: frontInterpolate }] }]}>
              <Text style={styles.cardTopic}>{activeCard.topic}</Text>
              <ScrollView contentContainerStyle={styles.cardTextContainer}>
                <Text style={styles.cardText}>{activeCard.front}</Text>
              </ScrollView>
              <Text style={styles.tapTip}>Tap to Reveal Answer</Text>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View style={[styles.cardFace, styles.cardBack, { transform: [{ rotateY: backInterpolate }] }]}>
              <Text style={styles.cardTopic}>{activeCard.topic}</Text>
              <ScrollView contentContainerStyle={styles.cardTextContainer}>
                <Text style={styles.cardText}>{activeCard.back}</Text>
              </ScrollView>
              <Text style={styles.tapTip}>Tap to See Question</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Spaced repetition rating controls */}
      <View style={styles.footer}>
        {isFlipped ? (
          <View style={styles.ratingRow}>
            <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleReview('AGAIN')}>
              <Text style={styles.ratingBtnText}>Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleReview('HARD')}>
              <Text style={styles.ratingBtnText}>Hard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#10B981' }]} onPress={() => handleReview('GOOD')}>
              <Text style={styles.ratingBtnText}>Good</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: '#8A57FE' }]} onPress={() => handleReview('EASY')}>
              <Text style={styles.ratingBtnText}>Easy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.flipPromptBtn} onPress={flipCard}>
            <Text style={styles.flipPromptText}>Reveal Answer</Text>
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
  },
  countText: {
    color: Colors.dark.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  cardArea: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  animatedCardContainer: {
    flex: 1,
    width: '100%',
  },
  touchableCard: {
    flex: 1,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backfaceVisibility: 'hidden',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    justifyContent: 'space-between',
  },
  cardFront: {
    // Normal rotation state
  },
  cardBack: {
    // Flipped state
  },
  cardTopic: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  cardTextContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardText: {
    color: '#FFF',
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  tapTip: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    padding: 24,
    justifyContent: 'center',
  },
  flipPromptBtn: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  flipPromptText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
