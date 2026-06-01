import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    level: number;
  };
  xp: number;
  isCurrentUser: boolean;
}

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

export default function DashboardScreen() {
  const { user, refreshProfile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlannerPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<'weekly' | 'global'>('weekly');

  const fetchData = async () => {
    try {
      await refreshProfile();
      
      const leaderRes: any = await api.get(
        `/api/gamification/leaderboard?type=${leaderboardType}`
      );
      setLeaderboard(leaderRes.data);

      try {
        const planRes: any = await api.get(
          '/api/study-planner/current'
        );
        setCurrentPlan(planRes.data);
      } catch (planErr) {
        console.log('No current plan found');
      }
    } catch (err) {
      console.log('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [leaderboardType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.post(`/api/study-planner/tasks/${taskId}/complete`);
      // Update local state
      if (currentPlan) {
        setCurrentPlan({
          ...currentPlan,
          tasks: currentPlan.tasks.map(t => t.id === taskId ? { ...t, isCompleted: true } : t),
        });
      }
      fetchData(); // Fetch new stats/XP
    } catch (err) {
      console.log('Failed to complete task:', err);
    }
  };

  const calculateProgress = () => {
    if (!user) return { percent: 0, nextXP: 100 };
    // Simple logic matching LEVEL_XP: 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5500
    const LEVEL_XP = [0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5500];
    const currentLvlXP = LEVEL_XP[user.level - 1] || 0;
    const nextLvlXP = LEVEL_XP[user.level] || (user.level * 1500); // safety fallback
    const xpNeededForLevel = nextLvlXP - currentLvlXP;
    const xpEarnedInLevel = user.xp - currentLvlXP;
    const percent = Math.min(Math.max((xpEarnedInLevel / xpNeededForLevel) * 100, 0), 100);
    return {
      percent,
      nextXP: nextLvlXP,
    };
  };

  const progress = calculateProgress();

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
      >
        {/* Header section with User and Streak */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <View style={styles.streakBox}>
            <Ionicons name="flame" size={24} color={Colors.dark.secondaryAccent} />
            <Text style={styles.streakCount}>{user?.streakCount ?? 0} Days</Text>
          </View>
        </View>

        {/* Level XP Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelInfo}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lvl {user?.level}</Text>
            </View>
            <View>
              <Text style={styles.xpText}>{user?.xp} / {progress.nextXP} XP</Text>
              <Text style={styles.xpSubtext}>{Math.round(progress.nextXP - (user?.xp ?? 0))} XP to Level up</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress.percent}%` }]} />
          </View>
        </View>

        {/* Learning quick actions */}
        <View style={styles.actionsRow}>
          <Link href="/battle/lobby" asChild>
            <TouchableOpacity style={[styles.actionCard, { borderLeftColor: Colors.dark.secondaryAccent }]}>
              <Ionicons name="trophy" size={26} color={Colors.dark.secondaryAccent} style={styles.actionIcon} />
              <Text style={styles.actionTitle}>1v1 Battle</Text>
              <Text style={styles.actionDesc}>Challenge friends real-time</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/planner/weekly" asChild>
            <TouchableOpacity style={[styles.actionCard, { borderLeftColor: Colors.dark.accent }]}>
              <Ionicons name="calendar" size={26} color={Colors.dark.accent} style={styles.actionIcon} />
              <Text style={styles.actionTitle}>Weekly Plan</Text>
              <Text style={styles.actionDesc}>Check daily study tasks</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Today's study planner tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
        </View>
        {currentPlan && currentPlan.tasks.length > 0 ? (
          <View style={styles.tasksBox}>
            {currentPlan.tasks.slice(0, 3).map((task) => (
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
                  <Text style={styles.taskTag}>{task.topic}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyTasksCard}>
            <Ionicons name="happy" size={32} color={Colors.dark.textSecondary} />
            <Text style={styles.emptyTasksText}>No study tasks scheduled for today.</Text>
            <Link href="/planner/weekly" asChild>
              <TouchableOpacity style={styles.generateBtn}>
                <Text style={styles.generateBtnText}>Open Study Planner</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Leaderboard panel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, leaderboardType === 'weekly' && styles.toggleBtnActive]}
              onPress={() => setLeaderboardType('weekly')}
            >
              <Text style={[styles.toggleText, leaderboardType === 'weekly' && styles.toggleTextActive]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, leaderboardType === 'global' && styles.toggleBtnActive]}
              onPress={() => setLeaderboardType('global')}
            >
              <Text style={[styles.toggleText, leaderboardType === 'global' && styles.toggleTextActive]}>Global</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.leaderboardBox}>
          {leaderboard.length > 0 ? (
            leaderboard.slice(0, 5).map((entry) => (
              <View key={entry.user.id} style={[styles.leaderboardItem, entry.isCurrentUser && styles.leaderboardItemSelf]}>
                <Text style={styles.rankText}>#{entry.rank}</Text>
                <View style={styles.leaderboardUser}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>{entry.user.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.leaderboardUserName}>{entry.user.name} {entry.isCurrentUser && '(You)'}</Text>
                    <Text style={styles.leaderboardUserLvl}>Lvl {entry.user.level}</Text>
                  </View>
                </View>
                <Text style={styles.leaderboardXP}>{entry.xp} XP</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyLeaderboardText}>No rankings found. Start studying to rank up!</Text>
          )}
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
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  userName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 42, 133, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 133, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  streakCount: {
    color: Colors.dark.secondaryAccent,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 14,
  },
  levelCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  levelBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  xpText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  xpSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 4,
  },
  actionIcon: {
    marginBottom: 12,
  },
  actionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: Colors.dark.backgroundElement,
  },
  toggleText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  tasksBox: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 28,
    gap: 14,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  taskCompletedText: {
    color: Colors.dark.textSecondary,
    textDecorationLine: 'line-through',
  },
  taskTag: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyTasksCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 28,
  },
  emptyTasksText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  generateBtn: {
    backgroundColor: 'rgba(138, 87, 254, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  generateBtnText: {
    color: Colors.dark.accent,
    fontWeight: '600',
  },
  leaderboardBox: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 14,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  leaderboardItemSelf: {
    backgroundColor: 'rgba(138, 87, 254, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderColor: 'rgba(138, 87, 254, 0.1)',
    borderWidth: 1,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.accent,
    width: 36,
  },
  leaderboardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarLetter: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  leaderboardUserName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  leaderboardUserLvl: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  leaderboardXP: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyLeaderboardText: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
