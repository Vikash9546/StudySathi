import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, FlatList, Alert, RefreshControl, Modal, Dimensions } from 'react-native';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';









export default function StudyScreen() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Action sheet modal state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/api/documents');
      setDocuments(res.data);
    } catch (err) {
      console.log('Error fetching documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Set up polling for documents that are processing
    const interval = setInterval(() => {
      if (documents.some((doc) => doc.status === 'PROCESSING')) {
        fetchDocuments();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [documents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/png',
        'image/jpeg'],

        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream'
      });

      await api.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      Alert.alert('Success', 'Document uploaded! AI parsing has started.');
      fetchDocuments();
    } catch (err) {
      Alert.alert('Upload Failed', err.message || 'Limit exceeded or invalid file type');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDoc = (doc) => {
    if (doc.status === 'PROCESSING') {
      Alert.alert('Processing', 'AI is currently analyzing this document. Please wait a moment!');
      return;
    }
    if (doc.status === 'FAILED') {
      Alert.alert('Error', 'AI failed to process this document. Try re-uploading a cleaner file.');
      return;
    }
    setSelectedDoc(doc);
    setModalVisible(true);
  };

  const handleAction = (action) => {
    if (!selectedDoc) return;
    setModalVisible(false);

    if (action === 'quiz') {
      // Direct launch quiz from document
      router.push(`/quiz/${selectedDoc.id}`);
    } else if (action === 'flashcard') {
      router.push(`/flashcard/${selectedDoc.id}`);
    } else if (action === 'tutor') {
      router.push({
        pathname: '/tutor/chat',
        params: { documentId: selectedDoc.id, documentTitle: selectedDoc.title }
      });
    } else if (action === 'notes') {
      router.push(`/notes/${selectedDoc.id}`);
    }
  };

  const renderDocItem = ({ item }) => {
    const isReady = item.status === 'READY';
    const isProcessing = item.status === 'PROCESSING';

    return (
      <TouchableOpacity style={styles.docCard} onPress={() => handleSelectDoc(item)}>
        <View style={styles.docIconBox}>
          <Ionicons
            name={item.title.endsWith('.pdf') ? 'document-text' : 'document'}
            size={28}
            color={isReady ? Colors.dark.accent : Colors.dark.textSecondary} />
          
        </View>
        <View style={styles.docDetails}>
          <Text style={styles.docTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.docMeta}>
            {Math.round(item.size / 1024)} KB • {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[
        styles.statusBadge,
        isReady && styles.statusReady,
        isProcessing && styles.statusProcessing]
        }>
          {isProcessing ?
          <ActivityIndicator size="small" color={Colors.dark.accent} /> :

          <Text style={[
          styles.statusText,
          isReady && styles.statusTextReady]
          }>
              {item.status}
            </Text>
          }
        </View>
      </TouchableOpacity>);

  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titleText}>Study Central</Text>
          <Text style={styles.subtext}>Upload study materials to auto-generate questions</Text>
        </View>
        <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument} disabled={uploading}>
          {uploading ?
          <ActivityIndicator color="#FFF" /> :
          <Ionicons name="cloud-upload" size={22} color="#FFF" />
          }
        </TouchableOpacity>
      </View>

      {/* Quiz History Banner */}
      <TouchableOpacity style={styles.historyBanner} onPress={() => router.push('/quiz/history')}>
        <View style={styles.historyBannerLeft}>
          <View style={styles.historyIconBox}>
            <Ionicons name="trophy" size={18} color="#f59e0b" />
          </View>
          <View>
            <Text style={styles.historyBannerTitle}>Quiz History</Text>
            <Text style={styles.historyBannerSub}>View past attempts & re-attempt quizzes</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>

      {loading ?
      <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View> :

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderDocItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
        ListEmptyComponent={
        <View style={styles.emptyContainer}>
              <Ionicons name="cloud-upload-outline" size={48} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>No documents uploaded yet.</Text>
              <TouchableOpacity style={styles.emptyUploadBtn} onPress={handlePickDocument}>
                <Text style={styles.emptyUploadBtnText}>Upload First Material</Text>
              </TouchableOpacity>
            </View>
        } />

      }

      {/* Action sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.dragBar} />
            <Text style={styles.modalDocTitle} numberOfLines={1}>{selectedDoc?.title}</Text>
            
            <View style={styles.optionsGrid}>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleAction('quiz')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(255, 42, 133, 0.1)' }]}>
                  <Ionicons name="create" size={24} color={Colors.dark.secondaryAccent} />
                </View>
                <Text style={styles.optionLabel}>Start Quiz</Text>
                <Text style={styles.optionSub}>Test your reading</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => handleAction('flashcard')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(138, 87, 254, 0.1)' }]}>
                  <Ionicons name="card" size={24} color={Colors.dark.accent} />
                </View>
                <Text style={styles.optionLabel}>SM-2 Flashcards</Text>
                <Text style={styles.optionSub}>Spaced repetition</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => handleAction('tutor')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="chatbubbles" size={24} color={Colors.dark.success} />
                </View>
                <Text style={styles.optionLabel}>Ask AI Tutor</Text>
                <Text style={styles.optionSub}>RAG search chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => handleAction('notes')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="shapes" size={24} color={Colors.dark.error} />
                </View>
                <Text style={styles.optionLabel}>Notes & Mind Map</Text>
                <Text style={styles.optionSub}>Formula lists & tree</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF'
  },
  subtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 4
  },
  uploadBtn: {
    backgroundColor: Colors.dark.accent,
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  listContainer: {
    padding: 20,
    gap: 16
  },
  historyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  historyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  historyBannerSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  docDetails: {
    flex: 1
  },
  docTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600'
  },
  docMeta: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  statusReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  statusProcessing: {
    backgroundColor: 'transparent'
  },
  statusText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  statusTextReady: {
    color: Colors.dark.success
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 16,
    marginBottom: 20
  },
  emptyUploadBtn: {
    backgroundColor: 'rgba(138, 87, 254, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  emptyUploadBtnText: {
    color: Colors.dark.accent,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundElement,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    marginBottom: 16
  },
  modalDocTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  optionItem: {
    width: (Dimensions.get('window').width - 64) / 2,
    backgroundColor: Colors.dark.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  optionLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  optionSub: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 4
  }
});