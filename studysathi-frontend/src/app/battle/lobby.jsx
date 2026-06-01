import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getSocket, disconnectSocket } from '../../services/socket';

import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BattleLobbyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searching, setSearching] = useState(false);
  const [playersJoined, setPlayersJoined] = useState(0);

  const startMatchmaking = async () => {
    setSearching(true);
    try {
      const socket = await getSocket();
      socket.connect();

      // We use a general document or challenge quiz ID (for example, "daily-challenge" or a dummy)
      const challengeId = 'matchmaker-challenge';
      // Mock question list for battle, backend selects questionIds from db
      const mockQuestionIds = ['q1', 'q2', 'q3', 'q4', 'q5'];

      // Join battle room
      socket.emit('battle:join', { challengeId, questionIds: mockQuestionIds });

      // Handle joined player counts
      socket.on('battle:player_joined', (data) => {
        setPlayersJoined(data.totalPlayers);
      });

      // Handle match start event from server
      socket.on('battle:start', (data) => {
        setSearching(false);
        socket.off('battle:player_joined');
        socket.off('battle:start');

        router.replace({
          pathname: '/battle/arena',
          params: { challengeId }
        });
      });
    } catch (err) {
      Alert.alert('Matchmaking Failed', err.message || 'Error connecting to battle server');
      setSearching(false);
    }
  };

  const cancelSearch = () => {
    disconnectSocket();
    setSearching(false);
    setPlayersJoined(0);
  };

  useEffect(() => {
    return () => {
      // Clean up socket if user leaves lobby
      if (searching) disconnectSocket();
    };
  }, [searching]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>1v1 Battle Arena</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {searching ?
        <View style={styles.searchBox}>
            <View style={styles.radarContainer}>
              <View style={styles.outerRadarCircle}>
                <View style={styles.innerRadarCircle}>
                  <Ionicons name="flash" size={40} color={Colors.dark.secondaryAccent} />
                </View>
              </View>
            </View>
            
            <Text style={styles.searchTitle}>Searching for Opponent...</Text>
            <Text style={styles.searchSub}>Matching you with online students matching your level.</Text>
            <Text style={styles.lobbyStatus}>Players Joined: {playersJoined} / 2</Text>

            <TouchableOpacity style={styles.cancelBtn} onPress={cancelSearch}>
              <Text style={styles.cancelBtnText}>Cancel Matchmaking</Text>
            </TouchableOpacity>
          </View> :

        <View style={styles.lobbyBox}>
            <View style={styles.battleIcon}>
              <Ionicons name="thunderstorm" size={60} color="#FFF" />
            </View>
            <Text style={styles.lobbyTitle}>Real-Time multiplayer battles</Text>
            <Text style={styles.lobbyDesc}>
              Test your recall speeds! Match 1v1 with an online opponent, answer MCQ questions, and see live score updates as you play. Winner receives **2x Level XP**!
            </Text>

            <TouchableOpacity style={styles.startBtn} onPress={startMatchmaking}>
              <Text style={styles.startBtnText}>Find a Quick Match</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        }
      </View>
    </SafeAreaView>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700'
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lobbyBox: {
    alignItems: 'center',
    width: '100%'
  },
  battleIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.secondaryAccent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.secondaryAccent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 32
  },
  lobbyTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  lobbyDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 12
  },
  startBtn: {
    backgroundColor: Colors.dark.secondaryAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.dark.secondaryAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  searchBox: {
    alignItems: 'center',
    width: '100%'
  },
  radarContainer: {
    marginBottom: 40
  },
  outerRadarCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255, 42, 133, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  innerRadarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 42, 133, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  searchSub: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20
  },
  lobbyStatus: {
    color: Colors.dark.secondaryAccent,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 40
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center'
  },
  cancelBtnText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  }
});