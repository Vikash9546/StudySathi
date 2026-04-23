import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Typography } from '../../components/Typography';
import { Button } from '../../components/Button';
import { useStore } from '../../store/useStore';

export const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, signup } = useStore();

  const handleAction = async () => {
    setError('');
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass || (!isLogin && !name)) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(trimmedEmail, trimmedPass);
      } else {
        await signup(name, trimmedEmail, trimmedPass);
      }
      navigation.replace('Home');
    } catch (err) {
      // Display the structured error from the backend (validate logic)
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Typography variant="h1" style={styles.title}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            {isLogin ? 'Continue your academic journey' : 'Join StudySathi for focused learning'}
          </Typography>

          {error ? (
            <View style={styles.errorContainer}>
              <Typography variant="caption" color={theme.colors.error} style={styles.errorText}>
                {error}
              </Typography>
            </View>
          ) : null}

          {!isLogin && (
            <View style={styles.helpBox}>
              <Typography variant="caption" color={theme.colors.textMuted}>
                Password needs: 8+ chars, 1 Uppercase, 1 Number
              </Typography>
            </View>
          )}

          <View style={styles.form}>
            {!isLogin && (
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            )}
            <TextInput
              placeholder="Email Address"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Button 
            title={isLogin ? 'Login' : 'Sign Up'} 
            loading={loading}
            onPress={handleAction} 
            style={styles.button}
          />

          <TouchableOpacity 
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={styles.switchBtn}
          >
            <Typography variant="caption" color={theme.colors.primary}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </Typography>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    marginBottom: 40,
  },
  errorContainer: {
    backgroundColor: `${theme.colors.error}10`,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${theme.colors.error}30`,
  },
  errorText: {
    textAlign: 'center',
  },
  helpBox: {
    marginBottom: 10,
    paddingLeft: 4,
  },
  form: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    height: 56,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  switchBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
});
