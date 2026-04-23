import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export const Typography = (props) => {
  const { 
    variant = 'body', 
    color, 
    style, 
    children, 
    ...rest 
  } = props;

  // Prioritize the passed color, then the theme default for that variant
  const textColor = color || (variant === 'caption' || variant === 'tiny' ? theme.colors.textSecondary : theme.colors.textPrimary);

  const getVariantStyle = () => {
    switch (variant) {
      case 'h1': return styles.h1;
      case 'h2': return styles.h2;
      case 'h3': return styles.h3;
      case 'bodyBold': return styles.bodyBold;
      case 'caption': return styles.caption;
      case 'tiny': return styles.tiny;
      default: return styles.body;
    }
  };

  return (
    <Text 
      style={[{ color: textColor }, getVariantStyle(), style]} 
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  h1: theme.typography.h1,
  h2: theme.typography.h2,
  h3: theme.typography.h3,
  body: theme.typography.body,
  bodyBold: theme.typography.bodyBold,
  caption: theme.typography.caption,
  tiny: theme.typography.tiny,
});
