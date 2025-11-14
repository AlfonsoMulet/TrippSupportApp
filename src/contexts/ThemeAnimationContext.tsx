import React, { createContext, useContext, useRef, useEffect, useMemo } from 'react';
import { Animated } from 'react-native';
import { useThemeStore, lightTheme, darkTheme, Theme } from '../store/themeStore';

interface AnimatedTheme {
  mode: 'light' | 'dark';
  colors: {
    background: Animated.AnimatedInterpolation<string>;
    surface: Animated.AnimatedInterpolation<string>;
    primary: Animated.AnimatedInterpolation<string>;
    secondary: Animated.AnimatedInterpolation<string>;
    accent: Animated.AnimatedInterpolation<string>;
    text: Animated.AnimatedInterpolation<string>;
    textSecondary: Animated.AnimatedInterpolation<string>;
    textTertiary: Animated.AnimatedInterpolation<string>;
    border: Animated.AnimatedInterpolation<string>;
    borderLight: Animated.AnimatedInterpolation<string>;
    shadow: Animated.AnimatedInterpolation<string>;
    error: Animated.AnimatedInterpolation<string>;
    success: Animated.AnimatedInterpolation<string>;
    warning: Animated.AnimatedInterpolation<string>;
    card: Animated.AnimatedInterpolation<string>;
    header: Animated.AnimatedInterpolation<string>;
    modalBackground: Animated.AnimatedInterpolation<string>;
    overlay: string; // Can't animate rgba
  };
}

const ThemeAnimationContext = createContext<AnimatedTheme | null>(null);

export const useAnimatedTheme = () => {
  const context = useContext(ThemeAnimationContext);
  if (!context) {
    throw new Error('useAnimatedTheme must be used within ThemeAnimationProvider');
  }
  return context;
};

export const ThemeAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useThemeStore();
  const animationValue = useRef(new Animated.Value(theme.mode === 'dark' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: theme.mode === 'dark' ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // Color interpolation needs false
    }).start();
  }, [theme.mode]);

  const animatedTheme: AnimatedTheme = useMemo(() => ({
    mode: theme.mode,
    colors: {
      background: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.background, darkTheme.colors.background],
      }),
      surface: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.surface, darkTheme.colors.surface],
      }),
      primary: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.primary, darkTheme.colors.primary],
      }),
      secondary: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.secondary, darkTheme.colors.secondary],
      }),
      accent: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.accent, darkTheme.colors.accent],
      }),
      text: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.text, darkTheme.colors.text],
      }),
      textSecondary: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.textSecondary, darkTheme.colors.textSecondary],
      }),
      textTertiary: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.textTertiary, darkTheme.colors.textTertiary],
      }),
      border: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.border, darkTheme.colors.border],
      }),
      borderLight: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.borderLight, darkTheme.colors.borderLight],
      }),
      shadow: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.shadow, darkTheme.colors.shadow],
      }),
      error: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.error, darkTheme.colors.error],
      }),
      success: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.success, darkTheme.colors.success],
      }),
      warning: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.warning, darkTheme.colors.warning],
      }),
      card: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.card, darkTheme.colors.card],
      }),
      header: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.header, darkTheme.colors.header],
      }),
      modalBackground: animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [lightTheme.colors.modalBackground, darkTheme.colors.modalBackground],
      }),
      overlay: theme.colors.overlay,
    },
  }), [theme.mode, animationValue]);

  return (
    <ThemeAnimationContext.Provider value={animatedTheme}>
      {children}
    </ThemeAnimationContext.Provider>
  );
};
