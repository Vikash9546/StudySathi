import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, RefreshControl, ScrollView } from 'react-native';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Post {
  id: string;
  title: string;
  content: string;
  topics: string[];
  upvotes: number;
  downvotes: number;
  createdAt: string;
  user: {
    name: string;
    avatarUrl: string | null;
  };
  _count: {
    answers: number;
  };
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | undefined>(undefined);

  // New Post form state
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTopics, setNewTopics] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      const res: any = await api.get(
        `/api/community/posts${activeTopic ? `?topic=${activeTopic}` : ''}`
      );
      setPosts(res.data.posts);
    } catch (err) {
      console.log('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTopic]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Please fill in Title and Content fields');
      return;
    }
    setSubmitting(true);
    try {
      const topicArray = newTopics.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/api/community/posts', {
        title: newTitle.trim(),
        content: newContent.trim(),
        topics: topicArray,
      });

      Alert.alert('Success', 'Post published successfully!');
      setModalVisible(false);
      setNewTitle('');
      setNewContent('');
      setNewTopics('');
      fetchPosts();
    } catch (err: any) {
      // Captures backend AI Moderation rejection feedback and displays it to the user
      Alert.alert('Post Rejected by AI Moderator', err.message || 'Toxic, abusive, or off-topic contents detected.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId: string, value: 1 | -1) => {
    try {
      const res: any = await api.post(
        `/api/community/posts/${postId}/vote`,
        { value }
      );
      // Update local state
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, upvotes: res.data.upvotes, downvotes: res.data.downvotes }
            : p
        )
      );
    } catch (err) {
      console.log('Vote failed:', err);
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => {
    return (
      <View style={styles.postCard}>
        <View style={styles.cardHeader}>
          <View style={styles.userIcon}>
            <Text style={styles.avatarLetter}>{item.user.name[0]}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.postTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent}>{item.content}</Text>

        <View style={styles.topicsRow}>
          {item.topics.map(t => (
            <View key={t} style={styles.topicChip}>
              <Text style={styles.topicText}>#{t}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.voteControls}>
            <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote(item.id, 1)}>
              <Ionicons name="arrow-up" size={18} color={Colors.dark.accent} />
              <Text style={styles.voteText}>{item.upvotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote(item.id, -1)}>
              <Ionicons name="arrow-down" size={18} color={Colors.dark.textSecondary} />
              <Text style={styles.voteText}>{item.downvotes}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.commentCount}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.textSecondary} />
            <Text style={styles.commentCountText}>{item._count?.answers ?? 0} Answers</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Community</Text>
        <Text style={styles.headerDesc}>Discuss and learn from peers worldwide</Text>
      </View>

      {/* Floating filter buttons */}
      <View style={styles.filtersBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <TouchableOpacity
            style={[styles.filterChip, activeTopic === undefined && styles.filterChipActive]}
            onPress={() => setActiveTopic(undefined)}
          >
            <Text style={[styles.filterChipText, activeTopic === undefined && styles.filterTextActive]}>All Topics</Text>
          </TouchableOpacity>
          {['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Coding', 'UPSC', 'General'].map(topic => (
            <TouchableOpacity
              key={topic}
              style={[styles.filterChip, activeTopic === topic && styles.filterChipActive]}
              onPress={() => setActiveTopic(topic)}
            >
              <Text style={[styles.filterChipText, activeTopic === topic && styles.filterTextActive]}>{topic}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active questions in this topic yet.</Text>
          }
        />
      )}

      {/* Floating create post button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* New Post modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask the Community</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.label}>Question Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Be specific (e.g. Help on organic naming)"
                placeholderTextColor={Colors.dark.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.label}>Detailed Content</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Explain what concept you need help with..."
                placeholderTextColor={Colors.dark.textSecondary}
                value={newContent}
                onChangeText={setNewContent}
                multiline
                numberOfLines={6}
              />

              <Text style={styles.label}>Topics (comma separated)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Physics, Mechanics, JEE"
                placeholderTextColor={Colors.dark.textSecondary}
                value={newTopics}
                onChangeText={setNewTopics}
              />

              <TouchableOpacity style={styles.publishBtn} onPress={handleCreatePost} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.publishBtnText}>Publish Question</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  filtersBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(138, 87, 254, 0.1)',
    borderColor: Colors.dark.accent,
  },
  filterChipText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.dark.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 80,
  },
  postCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  userIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  userName: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  postTime: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  postTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  postContent: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  topicChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topicText: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.02)',
    paddingTop: 12,
  },
  voteControls: {
    flexDirection: 'row',
    gap: 16,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voteText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCountText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    paddingVertical: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: Colors.dark.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundElement,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    height: '80%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalForm: {
    gap: 16,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: Colors.dark.background,
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
  },
  modalTextArea: {
    textAlignVertical: 'top',
  },
  publishBtn: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  publishBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
