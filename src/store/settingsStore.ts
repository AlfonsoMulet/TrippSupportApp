import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DistanceUnit = 'km' | 'miles';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type Language = 'en' | 'es' | 'de' | 'fr' | 'it';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
];

interface SettingsStore {
  distanceUnit: DistanceUnit;
  dateFormat: DateFormat;
  language: Language;
  
  setDistanceUnit: (unit: DistanceUnit) => void;
  setDateFormat: (format: DateFormat) => void;
  setLanguage: (language: Language) => void;
  
  // Utility functions
  formatDistance: (distance: number) => string;
  formatDate: (date: Date) => string;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      distanceUnit: 'km',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      
      setDistanceUnit: (unit: DistanceUnit) => {
        set({ distanceUnit: unit });
      },
      
      setDateFormat: (format: DateFormat) => {
        set({ dateFormat: format });
      },
      
      setLanguage: (language: Language) => {
        set({ language });
      },
      
      // Format distance based on user preference
      formatDistance: (distance: number) => {
        const { distanceUnit } = get();
        if (distanceUnit === 'miles') {
          const miles = distance * 0.621371;
          return `${miles.toFixed(1)} mi`;
        }
        return `${distance.toFixed(1)} km`;
      },
      
      // Format date based on user preference
      formatDate: (date: Date) => {
        const { dateFormat } = get();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        switch (dateFormat) {
          case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
          case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
          case 'MM/DD/YYYY':
          default:
            return `${month}/${day}/${year}`;
        }
      },
    }),
    {
      name: 'settings-storage',
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
