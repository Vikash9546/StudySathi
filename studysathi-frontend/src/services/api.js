import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri;
const ip = hostUri ? hostUri.split(':')[0] : 'localhost';
const API_BASE_URL = `http://${ip}:3000`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add auth header
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 token expirations and rotate tokens
api.interceptors.response.use(
  (response) => response.data, // Unwraps the standard { success: true, data: ... } structure from NestJS backend
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token stored');

        // Request token rotation from backend refresh endpoint
        const res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken }
        );

        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        await AsyncStorage.setItem('accessToken', newAccess);
        await AsyncStorage.setItem('refreshToken', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Logging out user if refresh token failed
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        // Let UI handle redirection
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);