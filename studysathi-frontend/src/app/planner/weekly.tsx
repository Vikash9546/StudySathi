import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PlannerTask {
  id: string;
  title: string;
  description: string;
  topic: string;
  isCompleted: boolean;
  dueDate: string;
}

interface PlannerPlan {
  id: string;
  goals: string[];
  tasks: PlannerTask[];
}

export default function WeeklyPlannerScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPlan = async () => {
    try {
      const res: any = await api.get('/api/study-planner/current');
      setPlan(res.data);
    } catch (err) {
      console.log('Error fetching planner plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const res: any = await api.post('/api/study-planner/generate');
      setPlan(res.data);
      Alert.alert('Success', 'AI generated a customized weekly study plan for your goals!');
    } catch (err: any) {
      Alert.alert('Failed to generate', err.message || 'Make sure onboarding settings are complete.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.post(`/api/study-planner/tasks/${taskId}/complete`);
      // Update local state
      if (plan) {
        setPlan({
          ...plan,
          tasks: plan.tasks.map(t => t.id === taskId ? { ...t, isCompleted: true } : t),
        });
      }
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Error updating task');
    }
  };

  // Group tasks by weekday name
  const getGroupedTasks = () => {
    if (!plan) return {};
    const grouped: Record<string, PlannerTask[]> = {
      'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
    };

    plan.tasks.forEach(task => {
      const date = new Date(task.dueDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (grouped[dayName]) {
        grouped[dayName].push(task);
      }
    });

    return grouped;
  };

  const groupedTasks = getGroupedTasks();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Study Planner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {plan ? (
          <View style={{ width: '100%' }}>
            {/* Goals block */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>
                <Ionicons name="bulb" size={18} color={Colors.dark.accent} /> Weekly AI Recommendations
              </Text>
              {plan.goals.map((goal, idx) => (
                <View key={idx} style={styles.goalRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.dark.accent} />
                  <Text style={styles.goalText}>{goal}</Text>
                </View>
              ))}
            </View>

            {/* Weekly Checklist Schedule */}
            <Text style={styles.sectionTitle}>Checklist Schedule</Text>
            {Object.entries(groupedTasks).map(([day, tasks]) => {
              if (tasks.length === 0) return null;
              return (
                <View key={day} style={styles.dayBlock}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  
                  <View style={styles.dayTasksBox}>
                    {tasks.map((task) => (
                      <View key={task.id} style={styles.taskItem}>
                        <TouchableOpacity
                          style={[styles.checkbox, task.isCompleted && styles.checkboxChecked]}
                          onPress={() => !task.isCompleted && handleCompleteTask(task.id)}
                          disabled={task.isCompleted}
                        >
                          {task.isCompleted && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </TouchableOpacity>
                        
                        <View style={styles.taskDetails}>
                          <Text style={[styles.taskTitle, task.isCompleted && styles.taskCompletedText]}>
                            {task.title}
                          </Text>
                          {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
                          <Text style={styles.taskTag}>{task.topic}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color={Colors.dark.textSecondary} style={{ marginBottom: 20 }} />
            <Text style={styles.emptyTitle}>No Active Study Plan</Text>
            <Text style={styles.emptySub}>
              Generate a personalized weekly plan targeting your specific exam goals and subjects. Our planner prioritizes areas where your quiz scores show weaknesses.
            </Text>

            <TouchableOpacity style={styles.generateBtn} onPress={handleGeneratePlan} disabled={generating}>
              {generating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.generateBtnText}>Generate with AI Planner</Text>
                  <Ionicons name="flash" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 28,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  goalText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  dayBlock: {
    marginBottom: 24,
  },
  dayTitle: {
    color: Colors.dark.accent,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayTasksBox: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.accent,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  taskCompletedText: {
    color: Colors.dark.textSecondary,
    textDecorationLine: 'line-through',
  },
  taskDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  taskTag: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptySub: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  generateBtn: {
    backgroundColor: Colors.dark.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
