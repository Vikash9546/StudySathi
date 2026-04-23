import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Brain, GraduationCap, ChevronRight, MoreVertical } from 'lucide-react-native';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useStore } from '../../store/useStore';

const TABS = ['Summary', 'Flashcards', 'Quiz'];

export const StudySetScreen = ({ navigation, route }) => {
  const { noteId, title } = route.params;
  const [activeTab, setActiveTab] = useState('Summary');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getResultsByNote, generateAI, deleteNote, updateNote } = useStore();

  const handleMore = () => {
    Alert.alert(
      'Study Note Options',
      'Choose an action for this note.',
      [
        {
          text: 'Rename',
          onPress: () => {
            Alert.prompt(
              'Rename Note',
              'Enter new title',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Save', 
                  onPress: async (newTitle) => {
                    if (newTitle) {
                      await updateNote(noteId, { title: newTitle });
                      navigation.setParams({ title: newTitle });
                    }
                  } 
                }
              ],
              'plain-text',
              title
            );
          }
        },
        {
          text: 'Delete Note',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Note',
              'Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: async () => {
                    await deleteNote(noteId);
                    navigation.goBack();
                  }
                }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  useEffect(() => {
    loadResults();
  }, [noteId]);

  const loadResults = async () => {
    setLoading(true);
    const data = await getResultsByNote(noteId);
    setResults(data);
    setLoading(false);
  };

  const handleGenerate = async (type) => {
    try {
      await generateAI(noteId, type);
      setTimeout(loadResults, 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  const summaryData = results.find(r => r.type === 'summary' && r.status === 'completed');
  const flashcardData = results.find(r => r.type === 'flashcards' && r.status === 'completed');
  const quizData = results.find(r => r.type === 'quiz' && r.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Typography variant="h3" numberOfLines={1} style={{ flex: 1, marginHorizontal: 16 }}>{title}</Typography>
          <TouchableOpacity onPress={handleMore}>
            <MoreVertical size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Typography 
                variant="caption" 
                color={activeTab === tab ? theme.colors.primary : theme.colors.textMuted}
              >
                {tab}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'Summary' && (
          <View>
            {!summaryData ? (
              <Card style={styles.emptyCard}>
                <Sparkles size={32} color={theme.colors.textMuted} />
                <Typography variant="body" style={{ marginVertical: 12 }}>No summary yet</Typography>
                <Button title="Generate Summary" onPress={() => handleGenerate('summary')} />
              </Card>
            ) : (
              <Typography variant="body">{summaryData.content}</Typography>
            )}
          </View>
        )}
        
        {activeTab === 'Flashcards' && (
          <View>
            {!flashcardData ? (
              <Card style={styles.emptyCard}>
                <Brain size={32} color={theme.colors.textMuted} />
                <Typography variant="body" style={{ marginVertical: 12 }}>No flashcards yet</Typography>
                <Button title="Generate Cards" onPress={() => handleGenerate('flashcards')} />
              </Card>
            ) : (
              <Typography variant="body">Flashcards ready: {flashcardData.data?.length || 0}</Typography>
            )}
          </View>
        )}

        {activeTab === 'Quiz' && (
          <View>
             {!quizData ? (
              <Card style={styles.emptyCard}>
                <GraduationCap size={32} color={theme.colors.textMuted} />
                <Typography variant="body" style={{ marginVertical: 12 }}>No quiz yet</Typography>
                <Button title="Generate Quiz" onPress={() => handleGenerate('quiz')} />
              </Card>
            ) : (
              <Typography variant="body">Quiz ready: {quizData.data?.length || 0} questions</Typography>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  activeTab: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  content: {
    padding: theme.spacing.lg,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.border,
  }
});
