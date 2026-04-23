import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export const ProgressBar = ({ progress = 0, style, height = 6, color = theme.colors.primary }) => {
  return (
    <View style={[styles.container, { height }, style]}>
      <View 
        style={[
          styles.fill, 
          { 
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: color,
            height 
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: theme.radius.full,
  },
});
