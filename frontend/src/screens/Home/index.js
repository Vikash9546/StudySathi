import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Upload as UploadIcon, Clock, CheckCircle, Flame, Search, BookOpen, Sparkles, ChevronRight, Share2 } from 'lucide-react-native';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { useStore } from '../../store/useStore';

export const HomeScreen = ({ navigation }) => {
  const { notes, user, token, fetchNotes } = useStore();

  useEffect(() => {
    if (token) {
      fetchNotes();
    }
  }, [token]);

  const stats = [
    { label: 'Total Focus', value: '32.5h', icon: Clock },
    { label: 'Items Mastered', value: '14', icon: CheckCircle },
    { label: 'Current Streak', value: '5 Days', icon: Flame },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <View style={styles.logoRow}>
          <BookOpen size={20} color={theme.colors.textPrimary} />
          <Typography variant="bodyBold" style={{ marginLeft: 8, letterSpacing: 1 }}>STUDYSATHI</Typography>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navIconButton}>
            <Search size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatarCircle} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Typography variant="tiny" color={theme.colors.textMuted} style={styles.academicTag}>
            ACADEMIC MODE • ACTIVE
          </Typography>
          <Typography variant="h1" style={styles.greeting}>
            Good morning, {user?.name?.split(' ')[0] || 'Alex'}
          </Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            You've completed 12 hours of deep work this week. Ready to dive back into Advanced Neurobiology?
          </Typography>
        </View>

        <View style={styles.mainActions}>
          <Button 
            title="Start Study Session" 
            onPress={() => {}} 
            style={styles.primaryAction} 
            icon={() => <Play size={16} color={theme.colors.white} fill={theme.colors.white} />}
          />
          <Button 
            title="Upload Notes" 
            variant="secondary" 
            onPress={() => navigation.navigate('Upload')} 
            icon={() => <UploadIcon size={18} color={theme.colors.textPrimary} />}
            style={styles.secondaryAction}
          />
          <TouchableOpacity style={styles.resumeBtn}>
            <Clock size={14} color={theme.colors.textMuted} />
            <Typography variant="tiny" color={theme.colors.textMuted} style={{ marginLeft: 6 }}>Resume Last Session</Typography>
          </TouchableOpacity>
        </View>

        <View style={styles.statsColumn}>
          {stats.map((stat, i) => (
            <Card key={i} style={styles.statLineCard}>
              <View style={styles.statIconBox}>
                <stat.icon size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Typography variant="tiny" color={theme.colors.textMuted}>{stat.label}</Typography>
                <Typography variant="h3">{stat.value}</Typography>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Typography variant="h2">Recent Study Items</Typography>
          <TouchableOpacity>
            <Typography variant="caption" color={theme.colors.textMuted} style={styles.viewLibraryLink}>View Library</Typography>
          </TouchableOpacity>
        </View>

        <View style={styles.noteList}>
          {notes.length === 0 ? (
            <Card style={styles.emptyNoteCard}>
               <Typography variant="body" color={theme.colors.textMuted}>Biology 402</Typography>
               <Typography variant="h3" style={{ marginVertical: 4 }}>Advanced Neurobiology: Synaptic Plasticity</Typography>
               <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 16 }}>
                 Comprehensive notes covering Hebbian theory, LTP, and long-term...
               </Typography>
               <View style={styles.masteryRow}>
                 <Typography variant="tiny" style={{ fontWeight: '700' }}>MASTERY PROGRESS</Typography>
                 <Typography variant="tiny">68%</Typography>
               </View>
               <ProgressBar progress={68} color={theme.colors.primary} />
            </Card>
          ) : (
            notes.map((note) => (
              <Card 
                key={note._id} 
                style={styles.noteListItem} 
                onPress={() => navigation.navigate('StudySet', { noteId: note._id, title: note.title })}
              >
                 <View style={styles.noteListIcon}>
                    <BookOpen size={18} color={theme.colors.textPrimary} />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Typography variant="tiny" color={theme.colors.textMuted}>MATH 301</Typography>
                    <Typography variant="bodyBold">{note.title}</Typography>
                    <Typography variant="tiny" color={theme.colors.textMuted}>Last studied 2 hours ago</Typography>
                 </View>
              </Card>
            ))
          )}
        </View>

        <Card style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Share2 size={16} color={theme.colors.textPrimary} />
            <Typography variant="tiny" style={{ fontWeight: '700', marginLeft: 8 }}>AI INSIGHT</Typography>
          </View>
          <Typography variant="body" style={styles.insightContent}>
            "You tend to struggle with receptor mechanisms between 40-50 minutes into a session. Try reviewing this topic first today."
          </Typography>
          <TouchableOpacity style={styles.drillLink}>
            <Typography variant="tiny" color={theme.colors.textMuted}>Generate Drill →</Typography>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navIconButton: {
    padding: 4,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: 32,
  },
  academicTag: {
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 32,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    lineHeight: 22,
  },
  mainActions: {
    gap: 12,
    marginBottom: 48,
  },
  primaryAction: {
    borderRadius: 8,
    height: 56,
  },
  secondaryAction: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 48,
    borderRadius: 8,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  statsColumn: {
    gap: 12,
    marginBottom: 48,
  },
  statLineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  viewLibraryLink: {
    textDecorationLine: 'underline',
  },
  noteList: {
    gap: 16,
    marginBottom: 32,
  },
  emptyNoteCard: {
    padding: 20,
    backgroundColor: theme.colors.white,
  },
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
  },
  noteListIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
    marginBottom: 40,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  drillLink: {
    marginTop: 8,
  }
});
