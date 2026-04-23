import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Upload as UploadIcon, X, FileText, ImageIcon, CheckCircle, ArrowLeft, BookOpen, Search, Sparkles } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { useStore } from '../../store/useStore';

const { width } = Dimensions.get('window');

export const UploadScreen = ({ navigation }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { uploadNote } = useStore();

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Picker error', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      await uploadNote(selectedFile);
      navigation.navigate('Home');
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <View style={styles.logoRow}>
          <BookOpen size={20} color={theme.colors.textPrimary} />
          <Typography variant="bodyBold" style={{ marginLeft: 8, letterSpacing: 1 }}>STUDYSATHI</Typography>
        </View>
        <View style={styles.avatarButton}>
          <View style={styles.avatarCircle} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Typography variant="h1" style={styles.title}>Transform your notes.</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.headerDesc}>
            Upload your lecture slides, PDFs, or handwritten notes to generate an AI-powered study set in seconds.
          </Typography>
        </View>

        <TouchableOpacity 
          style={styles.dropZone} 
          onPress={handlePickDocument}
          activeOpacity={0.7}
        >
          <View style={styles.dropIconBox}>
            <FileText size={32} color={theme.colors.textPrimary} />
          </View>
          <Typography variant="bodyBold">Drag and drop files</Typography>
          <Typography variant="caption" color={theme.colors.textMuted}>
            Support for PDF, JPG, PNG and DOCX (Max 50MB)
          </Typography>
          <View style={styles.selectBtn}>
            <Typography variant="tiny" style={{ fontWeight: '700', color: theme.colors.white }}>SELECT FILES</Typography>
          </View>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.queue}>
            <View style={styles.queueHeader}>
              <Typography variant="bodyBold">Queue</Typography>
              <Typography variant="tiny" color={theme.colors.textMuted}>1 Files</Typography>
            </View>
            <Card style={styles.queueCard}>
              <View style={styles.queueRow}>
                <View style={styles.fileIconBox}>
                   <FileText size={18} color={theme.colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="tiny" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="tiny" color={theme.colors.textMuted}>
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB • {selectedFile.mimeType ? 'Ready' : 'Uploading'}
                  </Typography>
                </View>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <X size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ProgressBar progress={100} color={theme.colors.textPrimary} style={{ marginTop: 12 }} />
            </Card>
          </View>
        )}

        <View style={styles.modeToggle}>
          <Typography variant="tiny" color={theme.colors.textMuted}>AI Recognition Mode</Typography>
          <Typography variant="tiny" style={{ fontWeight: '700' }}>ACADEMIC DEPTH</Typography>
        </View>

        <Button 
          title="CONVERT TO STUDY SET" 
          onPress={handleUpload}
          loading={isProcessing}
          disabled={!selectedFile}
          style={styles.convertBtn}
          icon={() => <Sparkles size={16} color={theme.colors.white} />}
        />

        <Card style={styles.proTipCard}>
          <Typography variant="tiny" style={{ fontWeight: '800', marginBottom: 4 }}>PRO TIP</Typography>
          <Typography variant="caption" color={theme.colors.textSecondary}>
            Uploading high-resolution scans of handwritten notes improves the accuracy of AI-generated summaries and flashcards.
          </Typography>
        </Card>

        <View style={styles.recentSection}>
          <Typography variant="h2" style={{ marginBottom: 20 }}>Recent Library Additions</Typography>
          
          <View style={styles.libraryGrid}>
            {[
              { title: 'Intro to Psychology', subtitle: 'FLASHCARDS • 24 ITEMS' },
              { title: 'Differential Calculus', subtitle: 'PRACTICE QUIZ • 15 QUESTIONS' },
              { title: 'Cellular Structure', subtitle: 'DEEP SUMMARY • 9 PAGES' },
            ].map((item, i) => (
              <Card key={i} style={styles.libraryItem}>
                <View style={styles.libraryImagePlaceholder} />
                <View style={styles.libraryItemInfo}>
                  <Typography variant="bodyBold" style={{ fontSize: 14 }}>{item.title}</Typography>
                  <Typography variant="tiny" color={theme.colors.textMuted} style={{ marginTop: 2 }}>{item.subtitle}</Typography>
                </View>
              </Card>
            ))}
          </View>
        </View>
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
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    marginBottom: 12,
  },
  headerDesc: {
    lineHeight: 22,
  },
  dropZone: {
    height: 240,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dropIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectBtn: {
    backgroundColor: theme.colors.black || '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  queue: {
    marginBottom: 40,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueCard: {
    padding: 16,
    backgroundColor: theme.colors.white,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  convertBtn: {
    height: 60,
    borderRadius: 12,
    marginBottom: 32,
  },
  proTipCard: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
    marginBottom: 60,
  },
  recentSection: {
    marginBottom: 40,
  },
  libraryGrid: {
    gap: 20,
  },
  libraryItem: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: theme.colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  libraryImagePlaceholder: {
    height: 120,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  libraryItemInfo: {
    padding: 16,
  }
});
