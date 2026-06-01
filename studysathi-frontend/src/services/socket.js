import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri;
const ip = hostUri ? hostUri.split(':')[0] : 'localhost';
const SOCKET_URL = `http://${ip}:3000/realtime`;

let socket = null;

export const getSocket = async () => {
  if (socket) return socket;

  const token = await AsyncStorage.getItem('accessToken');

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket']
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};