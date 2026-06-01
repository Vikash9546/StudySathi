import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';




















export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/gamification/stats');
      setStats(res.data);
    } catch (err) {
      console.log('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // Simulate Stripe/Razorpay payment verification
      const res = await api.post('/api/subscription/upgrade', {
        gateway: 'razorpay',
        externalId: `pay_sim_${Date.now()}`
      });

      Alert.alert('Celebration!', 'You are now a PRO member! Unlimited uploads unlocked.');
      await refreshProfile();
      fetchStats();
    } catch (err) {
      Alert.alert('Upgrade Failed', err.message || 'Error processing payment');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>);

  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* User Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name[0]}</Text>
          </View>
          <Text style={styles.nameText}>{user?.name}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
          
          <View style={[styles.planBadge, user?.plan === 'PRO' && styles.proPlanBadge]}>
            <Text style={[styles.planText, user?.plan === 'PRO' && styles.proPlanText]}>
              {user?.plan} MEMBER
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statsStripItem}>
            <Ionicons name="flash" size={20} color={Colors.dark.accent} />
            <Text style={styles.statsStripVal}>{user?.xp}</Text>
            <Text style={styles.statsStripLabel}>Total XP</Text>
          </View>
          <View style={styles.statsStripItem}>
            <Ionicons name="flame" size={20} color={Colors.dark.secondaryAccent} />
            <Text style={styles.statsStripVal}>{user?.streakCount}</Text>
            <Text style={styles.statsStripLabel}>Streak</Text>
          </View>
          <View style={styles.statsStripItem}>
            <Ionicons name="ribbon" size={20} color={Colors.dark.success} />
            <Text style={styles.statsStripVal}>{stats?.badges.length ?? 0}</Text>
            <Text style={styles.statsStripLabel}>Badges</Text>
          </View>
        </View>

        {/* Pro upgrade banner panel */}
        {user?.plan === 'FREE' &&
        <View style={styles.proUpgradeBanner}>
            <View style={styles.proBannerHeader}>
              <Ionicons name="sparkles" size={24} color={Colors.dark.secondaryAccent} />
              <Text style={styles.proTitle}>Upgrade to StudySathi Pro</Text>
            </View>
            <Text style={styles.proDesc}>
              Unlock unlimited AI Tutor queries, daily document uploads, custom subject schedules, and streak freeze protections.
            </Text>
            <TouchableOpacity style={styles.proBtn} onPress={handleUpgrade} disabled={upgrading}>
              {upgrading ?
            <ActivityIndicator color="#FFF" /> :

            <Text style={styles.proBtnText}>Get PRO for $4.99/mo</Text>
            }
            </TouchableOpacity>
          </View>
        }

        {/* Badges list collection grid */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Badges Earned</Text>
          {stats && stats.badges.length > 0 ?
          <View style={styles.badgesGrid}>
              {stats.badges.map((ub, idx) =>
            <View key={idx} style={styles.badgeItem}>
                  <View style={styles.badgeIconBox}>
                    <Text style={styles.badgeIcon}>{ub.badge.icon}</Text>
                  </View>
                  <Text style={styles.badgeName}>{ub.badge.name}</Text>
                  <Text style={styles.badgeDesc}>{ub.badge.description}</Text>
                </View>
            )}
            </View> :

          <View style={styles.emptyBadgesCard}>
              <Ionicons name="lock-closed" size={28} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyBadgesText}>Upload documents and complete quizzes to unlock custom badges!</Text>
            </View>
          }
        </View>

        {/* Logout action trigger */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.dark.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40
  },
  profileHeaderCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  avatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold'
  },
  nameText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700'
  },
  emailText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 4
  },
  planBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  proPlanBadge: {
    backgroundColor: 'rgba(255, 42, 133, 0.1)'
  },
  planText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  proPlanText: {
    color: Colors.dark.secondaryAccent
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24
  },
  statsStripItem: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.02)'
  },
  statsStripVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6
  },
  statsStripLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 2
  },
  proUpgradeBanner: {
    backgroundColor: 'rgba(255, 42, 133, 0.05)',
    borderWidth: 1.5,
    borderColor: Colors.dark.secondaryAccent,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24
  },
  proBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10
  },
  proTitle: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16
  },
  proDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20
  },
  proBtn: {
    backgroundColor: Colors.dark.secondaryAccent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.dark.secondaryAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  proBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14
  },
  sectionBox: {
    marginBottom: 24
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  badgeItem: {
    width: (Dimensions.get('window').width - 56) / 2,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  badgeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  badgeIcon: {
    fontSize: 22
  },
  badgeName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600'
  },
  badgeDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14
  },
  emptyBadgesCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  emptyBadgesText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    paddingVertical: 14
  },
  logoutText: {
    color: Colors.dark.error,
    fontWeight: '600'
  }
});