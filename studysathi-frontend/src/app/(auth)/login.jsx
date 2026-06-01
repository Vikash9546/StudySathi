import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'expo-router';
import { Colors } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <Text style={styles.logoText}>StudySathi</Text>
            <Text style={styles.subtext}>Your AI-powered study companion</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                styles.input,
                focusedInput === 'email' && styles.inputFocused]
                }
                placeholder="Enter your email"
                placeholderTextColor={Colors.dark.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)} />
              
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[
                styles.input,
                focusedInput === 'password' && styles.inputFocused]
                }
                placeholder="Enter your password"
                placeholderTextColor={Colors.dark.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)} />
              
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitButton} onPress={handleLogin} disabled={loading}>
              {loading ?
              <ActivityIndicator color="#fff" /> :

              <Text style={styles.submitBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Register</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.dark.accent,
    letterSpacing: 1,
    textShadowColor: 'rgba(138, 87, 254, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10
  },
  subtext: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 8
  },
  formContainer: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 24,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.dark.text,
    fontSize: 16
  },
  inputFocused: {
    borderColor: Colors.dark.accent,
    borderWidth: 1.5
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24
  },
  forgotText: {
    color: Colors.dark.textSecondary,
    fontSize: 13
  },
  submitButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  footerText: {
    color: Colors.dark.textSecondary,
    fontSize: 14
  },
  linkText: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontWeight: '600'
  }
});