import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, LogOut, Save, Camera } from 'lucide-react-native';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useStore } from '../../store/useStore';

export const ProfileScreen = ({ navigation }) => {
  const { user, updateProfile, token } = useStore();
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ bio });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // In a manual switcher, we just reset the state in App.js or similar
    // For now, let's just go to Auth and rely on the manual switcher 
    // being reset if we reload, but for active session we'll just redirect
    navigation.replace('Auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="h3" style={{ marginLeft: 16 }}>Profile Settings</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <User size={60} color={theme.colors.textMuted} />
            <TouchableOpacity style={styles.cameraBtn}>
              <Camera size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Typography variant="h2" style={{ marginTop: 16 }}>{user?.name}</Typography>
          <Typography variant="caption" color={theme.colors.textSecondary}>{user?.email}</Typography>
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" style={styles.sectionTitle}>About Me</Typography>
          <TextInput
            placeholder="Tell us about your study goals..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.bioInput}
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
          />
          <Button 
            title="Save Changes" 
            loading={loading} 
            onPress={handleSave} 
            icon={Save}
            style={{ marginTop: 16 }}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle" style={styles.sectionTitle}>Account</Typography>
          <Card variant="outline" style={styles.infoRow}>
            <Mail size={20} color={theme.colors.textMuted} />
            <View style={{ marginLeft: 12 }}>
              <Typography variant="caption">Email</Typography>
              <Typography variant="body">{user?.email}</Typography>
            </View>
          </Card>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.error} />
          <Typography variant="bodyBold" color={theme.colors.error} style={{ marginLeft: 12 }}>Logout</Typography>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  content: {
    padding: theme.spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  bioInput: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: `${theme.colors.error}10`,
    borderRadius: theme.radius.md,
    marginTop: 20,
    marginBottom: 40,
  }
});
