import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NotesData {
  summary: string;
  keyPoints: string[];
  formulaSheet: string | null;
  examNotes: string;
}

interface MindMapNode {
  name: string;
  details?: string;
  children?: MindMapNode[];
}

interface MindMapData {
  title: string;
  mapData: {
    root: string;
    branches: {
      name: string;
      children?: MindMapNode[];
    }[];
  };
}

export default function RevisionNotesScreen() {
  const { docId } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notes' | 'mindmap'>('notes');
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded nodes state for Mind Map tree
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchRevisionContent = async () => {
      try {
        const notesRes: any = await api.post(
          `/api/ai-tutor/documents/${docId}/revision-notes`
        );
        setNotes(notesRes.data);

        const mapRes: any = await api.post(
          `/api/ai-tutor/documents/${docId}/mind-map`
        );
        setMindMap(mapRes.data);
      } catch (err: any) {
        Alert.alert('Analysis Failed', err.message || 'Error generating summary content');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchRevisionContent();
  }, [docId]);

  const toggleBranch = (branchName: string) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchName]: !prev[branchName],
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Analyzing Document & Generating Notes...</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>Revision Suite</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'notes' && styles.tabBtnActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Revision Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'mindmap' && styles.tabBtnActive]}
          onPress={() => setActiveTab('mindmap')}
        >
          <Text style={[styles.tabText, activeTab === 'mindmap' && styles.tabTextActive]}>AI Mind Map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Revision Notes rendering */}
        {activeTab === 'notes' && notes && (
          <View style={styles.notesSection}>
            {/* Summary Box */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>
                <Ionicons name="document-text" size={18} color={Colors.dark.accent} /> AI Summary
              </Text>
              <Text style={styles.summaryText}>{notes.summary}</Text>
            </View>

            {/* Key Points list */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>
                <Ionicons name="list" size={18} color={Colors.dark.accent} /> Key Concepts
              </Text>
              {notes.keyPoints.map((point, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))}
            </View>

            {/* Formula sheet box */}
            {notes.formulaSheet && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>
                  <Ionicons name="calculator" size={18} color={Colors.dark.accent} /> Formula Sheet
                </Text>
                <Text style={styles.formulaText}>{notes.formulaSheet}</Text>
              </View>
            )}

            {/* Exam Tips box */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>
                <Ionicons name="ribbon" size={18} color={Colors.dark.accent} /> Exam Study Tips
              </Text>
              <Text style={styles.summaryText}>{notes.examNotes}</Text>
            </View>
          </View>
        )}

        {/* Mind Map Tree visualizer rendering */}
        {activeTab === 'mindmap' && mindMap && (
          <View style={styles.mindMapSection}>
            <Text style={styles.mindMapTitle}>{mindMap.title}</Text>
            
            {/* Root node */}
            <View style={styles.rootNodeBox}>
              <Text style={styles.rootNodeText}>{mindMap.mapData.root}</Text>
            </View>
            <View style={styles.treeLineVertical} />

            {/* Branches rendering */}
            <View style={styles.branchesBox}>
              {mindMap.mapData.branches.map((branch, bIdx) => {
                const isExpanded = expandedBranches[branch.name];
                return (
                  <View key={bIdx} style={styles.branchContainer}>
                    <TouchableOpacity style={[styles.branchHeaderCard, isExpanded && styles.branchExpandedCard]} onPress={() => toggleBranch(branch.name)}>
                      <Text style={styles.branchTitle}>{branch.name}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isExpanded ? Colors.dark.accent : Colors.dark.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && branch.children && (
                      <View style={styles.childrenWrapper}>
                        <View style={styles.treeLineLeftBorder} />
                        <View style={styles.childrenList}>
                          {branch.children.map((child, cIdx) => (
                            <View key={cIdx} style={styles.childItemRow}>
                              <View style={styles.treeLineHorizontal} />
                              <View style={styles.childCard}>
                                <Text style={styles.childName}>{child.name}</Text>
                                {child.details && <Text style={styles.childDetails}>{child.details}</Text>}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
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
    padding: 24,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.dark.background,
  },
  tabText: {
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: Colors.dark.accent,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  notesSection: {
    gap: 20,
  },
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  bullet: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bulletText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  formulaText: {
    color: Colors.dark.accent,
    fontSize: 15,
    fontFamily: 'monospace',
    lineHeight: 22,
  },
  mindMapSection: {
    alignItems: 'center',
  },
  mindMapTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  rootNodeBox: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  rootNodeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  treeLineVertical: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  branchesBox: {
    width: '100%',
    gap: 16,
  },
  branchContainer: {
    width: '100%',
  },
  branchHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  branchExpandedCard: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(138, 87, 254, 0.05)',
  },
  branchTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  childrenWrapper: {
    flexDirection: 'row',
  },
  treeLineLeftBorder: {
    width: 2,
    marginLeft: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  childrenList: {
    flex: 1,
    paddingLeft: 12,
    gap: 12,
    paddingVertical: 12,
  },
  childItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treeLineHorizontal: {
    width: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  childCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  childName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  childDetails: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
});
