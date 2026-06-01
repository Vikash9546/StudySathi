import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { router } from 'expo-router';

























const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const res = await api.get('/api/auth/me');
          console.log('[AuthContext] restoreSession - res:', JSON.stringify(res));
          console.log('[AuthContext] restoreSession - setting user to:', JSON.stringify(res.data.user));
          setUser(res.data.user);
        }
      } catch (err) {
        console.log('Restoration failed:', err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post(
      '/api/auth/login',
      { email, password }
    );
    console.log('[AuthContext] login - res:', JSON.stringify(res));
    const { user: loggedUser, accessToken, refreshToken } = res.data;
    console.log('[AuthContext] login - setting user to:', JSON.stringify(loggedUser));
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    setUser(loggedUser);

    if (loggedUser.examGoal) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  const register = async (name, email, password) => {
    const res = await api.post(
      '/api/auth/register',
      { name, email, password }
    );
    console.log('[AuthContext] register - res:', JSON.stringify(res));
    const { user: registeredUser, accessToken, refreshToken } = res.data;
    console.log('[AuthContext] register - setting user to:', JSON.stringify(registeredUser));
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    setUser(registeredUser);
    router.replace('/(auth)/onboarding');
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch {}
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    setUser(null);
    router.replace('/(auth)/login');
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/api/auth/me');
      console.log('[AuthContext] refreshProfile - res:', JSON.stringify(res));
      setUser(res.data.user);
    } catch {}
  };

  const completeOnboarding = async (data) => {
    const res = await api.post('/api/profile/onboarding', data);
    console.log('[AuthContext] completeOnboarding - res:', JSON.stringify(res));
    console.log('[AuthContext] completeOnboarding - setting user to:', JSON.stringify(res.data));
    setUser(res.data);
    router.replace('/(tabs)');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>);

};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};