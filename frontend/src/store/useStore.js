import { create } from 'zustand';
import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL = 'http://10.2.90.193:5001/api';

export const useStore = create((set, get) => ({
  user: null,
  token: null,
  notes: [],
  
  fetchNotes: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`${BASE_URL}/study/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ notes: res.data.data.notes || [] });
    } catch (err) {
      console.error('Fetch notes failed', err);
    }
  },

  uploadNote: async (file) => {
    const { token } = get();
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    
    // For iOS/Android with Expo, we often need the uri as is, 
    // but with a proper name and type for the multipart boundary.
    const fileToUpload = {
      uri: file.uri,
      type: file.mimeType || 'application/pdf',
      name: file.name || 'document.pdf',
    };

    formData.append('note', fileToUpload);

    try {
      const res = await axios.post(`${BASE_URL}/study/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        // IMPORTANT: Higher timeout for file uploads
        timeout: 30000 
      });
      get().fetchNotes();
      return res.data;
    } catch (err) {
      if (err.message === 'Network Error') {
        throw new Error('Network Error: Check if your phone and Mac are on the same WiFi.');
      }
      throw new Error(err.response?.data?.message || 'Upload failed');
    }
  },
  
  login: async (email, password) => {
    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
      set({ user: res.data.data.user, token: res.data.data.token });
      return res.data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  },

  signup: async (name, email, password) => {
    try {
      const res = await axios.post(`${BASE_URL}/auth/signup`, { name, email, password });
      set({ user: res.data.data.user, token: res.data.data.token });
      return res.data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Signup failed');
    }
  },

  generateAI: async (noteId, type) => {
    const { token } = get();
    try {
      await axios.post(`${BASE_URL}/ai/generate`, { noteId, type }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Generation failed');
    }
  },

  getResultsByNote: async (noteId) => {
    const { token } = get();
    try {
      const res = await axios.get(`${BASE_URL}/ai/results/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data || [];
    } catch (err) {
      console.error('Fetch results failed', err);
      return [];
    }
  },

  updateNote: async (noteId, data) => {
    const { token } = get();
    try {
      const res = await axios.put(`${BASE_URL}/study/notes/${noteId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchNotes();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Update failed');
    }
  },

  deleteNote: async (noteId) => {
    const { token } = get();
    try {
      await axios.delete(`${BASE_URL}/study/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchNotes();
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Delete failed');
    }
  }
}));
