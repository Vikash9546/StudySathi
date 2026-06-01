import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: { content: string; similarity: number }[];
}

interface ChatSession {
  id: string;
  createdAt: string;
  messages: { role: string; content: string; timestamp: string }[];
}

export default function AITutorChatScreen() {
  const { documentId, documentTitle } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch past sessions
  const fetchSessions = async () => {
    try {
      const res: any = await api.get('/api/ai-tutor/sessions');
      setSessions(res.data);
      // If there are sessions, we can default to the latest session if not in a document context
      if (res.data.length > 0 && !documentId && !sessionId) {
        loadSession(res.data[0]);
      }
    } catch (err) {
      console.log('Error fetching sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadSession = (session: ChatSession) => {
    setSessionId(session.id);
    const parsedMessages = (session.messages as any[]).map((msg, idx) => ({
      id: `${session.id}-${idx}`,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
    }));
    setMessages(parsedMessages);
    setShowHistory(false);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res: any = await api.post('/api/ai-tutor/ask', {
        question: userText,
        documentId: documentId as string || undefined,
        sessionId,
      });

      const tutorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.data.answer,
        timestamp: new Date().toISOString(),
        sources: res.data.sources,
      };

      setMessages(prev => [...prev, tutorMessage]);
      
      // Re-fetch sessions to update history drawer
      fetchSessions();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to get answer from AI tutor');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const toggleSources = (msgId: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>AI Tutor Chat</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {documentTitle ? `Context: ${documentTitle}` : 'General Tutor RAG'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.iconBtn}>
          <Ionicons name="time" size={24} color={showHistory ? Colors.dark.accent : '#FFF'} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* History sidebar overlay drawer */}
          {showHistory && (
            <View style={styles.historyDrawer}>
              <Text style={styles.drawerTitle}>Recent Chats</Text>
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.historyItem} onPress={() => loadSession(item)}>
                    <Ionicons name="chatbox-ellipses-outline" size={18} color={Colors.dark.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyItemText} numberOfLines={1}>
                        {item.messages[0]?.content || 'New Session'}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyDrawerText}>No past conversations</Text>
                }
              />
            </View>
          )}

          {/* Main chat interface */}
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.chatScroll}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <View style={styles.welcomeBox}>
                  <View style={styles.botIcon}>
                    <Ionicons name="school" size={32} color="#FFF" />
                  </View>
                  <Text style={styles.welcomeTitle}>Ask StudySathi Tutor</Text>
                  <Text style={styles.welcomeText}>
                    Ask questions about your study documents. I will search inside the parsed notes to answer you without hallucinations.
                  </Text>
                </View>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const hasSources = msg.sources && msg.sources.length > 0;
                const sourcesExpanded = expandedSources[msg.id];

                return (
                  <View key={msg.id} style={[styles.messageRow, isUser ? styles.rowUser : styles.rowBot]}>
                    {!isUser && (
                      <View style={styles.botMiniIcon}>
                        <Ionicons name="school" size={14} color="#FFF" />
                      </View>
                    )}
                    <View style={{ maxWidth: '82%' }}>
                      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                        <Text style={styles.messageText}>{msg.content}</Text>
                      </View>
                      
                      {/* RAG Citation source links */}
                      {!isUser && hasSources && (
                        <View style={styles.sourcesWrapper}>
                          <TouchableOpacity style={styles.sourcesTrigger} onPress={() => toggleSources(msg.id)}>
                            <Ionicons name="link" size={12} color={Colors.dark.accent} />
                            <Text style={styles.sourcesTriggerText}>
                              {sourcesExpanded ? 'Hide Sources' : `Show ${msg.sources!.length} Sources`}
                            </Text>
                            <Ionicons name={sourcesExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.dark.accent} />
                          </TouchableOpacity>
                          
                          {sourcesExpanded && (
                            <View style={styles.sourcesBox}>
                              {msg.sources!.map((src, sIdx) => (
                                <View key={sIdx} style={styles.sourceItem}>
                                  <View style={styles.sourceHeader}>
                                    <Text style={styles.sourceLabel}>Source {sIdx + 1}</Text>
                                    <Text style={styles.sourceAccuracy}>{src.similarity}% Match</Text>
                                  </View>
                                  <Text style={styles.sourceContent}>{src.content}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {loading && (
                <View style={styles.messageRow}>
                  <View style={styles.botMiniIcon}>
                    <Ionicons name="school" size={14} color="#FFF" />
                  </View>
                  <View style={[styles.bubble, styles.bubbleBot, styles.loadingBubble]}>
                    <ActivityIndicator size="small" color={Colors.dark.accent} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom input area */}
            <View style={styles.inputArea}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask a question..."
                placeholderTextColor={Colors.dark.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Ionicons name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
  headerInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  chatScroll: {
    padding: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  welcomeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  botIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  welcomeText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowBot: {
    justifyContent: 'flex-start',
  },
  botMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: Colors.dark.accent,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: Colors.dark.backgroundElement,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadingBubble: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  messageText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: Colors.dark.background,
    gap: 12,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 24,
    color: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  historyDrawer: {
    width: 240,
    backgroundColor: Colors.dark.backgroundElement,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    padding: 16,
  },
  drawerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  historyItemText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  historyItemDate: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  emptyDrawerText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sourcesWrapper: {
    marginTop: 8,
  },
  sourcesTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  sourcesTriggerText: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  sourcesBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  sourceItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
    paddingBottom: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sourceLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceAccuracy: {
    color: Colors.dark.success,
    fontSize: 10,
    fontWeight: '700',
  },
  sourceContent: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
