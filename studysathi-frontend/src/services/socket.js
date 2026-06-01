import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SOCKET_URL = Platform.select({
  android: 'http://10.0.2.2:3000/realtime',
  default: 'http://localhost:3000/realtime'
});

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