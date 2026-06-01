import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.accent} />
    </View>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center'
  }
});