import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark';

// Get system color scheme
const getSystemTheme = (): ThemeMode => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

export interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderLight: string;
    shadow: string;
    error: string;
    success: string;
    warning: string;
    card: string;
    header: string;
    modalBackground: string;
    overlay: string;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    primary: '#2563eb',
    secondary: '#6b7280',
    accent: '#10b981',
    text: '#1f2937',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    shadow: '#000000',
    error: '#ef4444',
    success: '#059669',
    warning: '#f59e0b',
    card: '#ffffff',
    header: '#ffffff',
    modalBackground: '#f8fafc',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#10b981',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    border: '#334155',
    borderLight: '#475569',
    shadow: '#000000',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    card: '#1e293b',
    header: '#1e293b',
    modalBackground: '#0f172a',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// Initialize with system theme
const systemMode = getSystemTheme();
const initialTheme = systemMode === 'dark' ? darkTheme : lightTheme;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: initialTheme,
      
      toggleTheme: () => {
        const currentMode = get().theme.mode;
        const newMode = currentMode === 'light' ? 'dark' : 'light';
        const newTheme = newMode === 'light' ? lightTheme : darkTheme;
        set({ theme: newTheme });
      },
      
      setTheme: (mode: ThemeMode) => {
        const newTheme = mode === 'light' ? lightTheme : darkTheme;
        set({ theme: newTheme });
      },
    }),
    {
      name: 'theme-storage',
      storage: {
        getItem: async (name: string) => {
          const item = await AsyncStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: async (name: string, value: any) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name: string) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);
