import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useTutorialStore } from '../store/tutorialStore';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { 
  useSettingsStore, 
  DistanceUnit, 
  DateFormat, 
  Language,
  languages,
  LanguageOption 
} from '../store/settingsStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsDeveloper } from '../utils/developerAccess';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { t } = useTranslation();
  const { 
    distanceUnit, 
    dateFormat, 
    language,
    setDistanceUnit,
    setDateFormat,
    setLanguage 
  } = useSettingsStore();
  
  const { resetTutorial, startTutorial } = useTutorialStore();
  const isDeveloper = useIsDeveloper();
  const { deleteTrip, trips } = useTripStore();
  const { user } = useAuthStore();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.Value(0)).current;

  const dismissModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(pan, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLanguageModal(false);
      setIsAnimating(false);
      pan.setValue(0);
    });
  };

  useEffect(() => {
    if (showLanguageModal && !isAnimating) {
      // Reset values before animating in
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      pan.setValue(0);
      setIsAnimating(true);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    }
  }, [showLanguageModal]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Dismiss if dragged down more than 150px
          setIsAnimating(true);
          Animated.parallel([
            Animated.timing(pan, {
              toValue: 600,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowLanguageModal(false);
            setIsAnimating(false);
            pan.setValue(0);
          });
        } else {
          // Spring back to original position
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const distanceUnits = [
    { value: 'km' as DistanceUnit, labelKey: 'settings.kilometers' as const },
    { value: 'miles' as DistanceUnit, labelKey: 'settings.miles' as const },
  ] as const;

  const dateFormats = [
    { value: 'MM/DD/YYYY' as DateFormat, label: 'MM/DD/YYYY', exampleKey: 'settings.dateFormatExample.mmddyyyy' as const },
    { value: 'DD/MM/YYYY' as DateFormat, label: 'DD/MM/YYYY', exampleKey: 'settings.dateFormatExample.ddmmyyyy' as const },
    { value: 'YYYY-MM-DD' as DateFormat, label: 'YYYY-MM-DD', exampleKey: 'settings.dateFormatExample.yyyymmdd' as const },
  ] as const;

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === language) || languages[0];
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const modalTranslateY = Animated.add(translateY, pan);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 32,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.07,
      shadowRadius: 8,
      elevation: 12,
      zIndex: 10,
      marginHorizontal: -16,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    optionCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 2,
    },
    optionCardSelected: {
      borderColor: theme.colors.primary,
    },
    optionCardUnselected: {
      borderColor: 'transparent',
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    optionText: {
      fontSize: 16,
      fontWeight: '500',
    },
    optionExample: {
      fontSize: 14,
      marginTop: 4,
    },
    languageButton: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    languageContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: 16,
      fontWeight: '500',
    },
    languageNative: {
      fontSize: 14,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: 0,
      maxHeight: '75%',
    },
    handleContainer: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
    },
    modalHeader: {
      paddingHorizontal: 20,
      paddingBottom: 0,
      paddingTop: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalList: {
      paddingHorizontal: 20,
    },
    modalListContent: {
      paddingBottom: 0,
    },
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedTheme.colors.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <Animated.View style={[styles.header, { backgroundColor: animatedTheme.colors.background }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]}>
            {t('settings.title')}
          </Animated.Text>
        </Animated.View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        > 
          {/* Distance Unit */}
          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>
              {t('settings.distanceUnit')}
            </Animated.Text>
            {distanceUnits.map((unit) => (
              <TouchableOpacity
                key={unit.value}
                onPress={() => setDistanceUnit(unit.value)}
              >
                <Animated.View
                  style={[
                    styles.optionCard,
                    { backgroundColor: animatedTheme.colors.card },
                    distanceUnit === unit.value 
                      ? styles.optionCardSelected 
                      : styles.optionCardUnselected,
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionLeft}>
                      <Ionicons 
                        name="speedometer-outline" 
                        size={24} 
                        color={distanceUnit === unit.value ? theme.colors.primary : theme.colors.textSecondary} 
                      />
                      <Animated.Text style={[
                        styles.optionText, 
                        { color: animatedTheme.colors.text }
                      ]}>
                        {t(unit.labelKey)}
                      </Animated.Text>
                    </View>
                    {distanceUnit === unit.value && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </View>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Format */}
          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>
              {t('settings.dateFormat')}
            </Animated.Text>
            {dateFormats.map((format) => (
              <TouchableOpacity
                key={format.value}
                onPress={() => setDateFormat(format.value)}
              >
                <Animated.View
                  style={[
                    styles.optionCard,
                    { backgroundColor: animatedTheme.colors.card },
                    dateFormat === format.value 
                      ? styles.optionCardSelected 
                      : styles.optionCardUnselected,
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionLeft}>
                      <Ionicons 
                        name="calendar-outline" 
                        size={24} 
                        color={dateFormat === format.value ? theme.colors.primary : theme.colors.textSecondary} 
                      />
                      <View>
                        <Animated.Text style={[
                          styles.optionText, 
                          { color: animatedTheme.colors.text }
                        ]}>
                          {format.label}
                        </Animated.Text>
                        <Animated.Text style={[
                          styles.optionExample, 
                          { color: animatedTheme.colors.textSecondary }
                        ]}>
                          {t(format.exampleKey)}
                        </Animated.Text>
                      </View>
                    </View>
                    {dateFormat === format.value && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </View>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reset Account */}
          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>
              {t('settings.resetAccount') || 'Reset'}
            </Animated.Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Reset Account',
                  'This will delete ALL your trips and reset the tutorial. Your account will be like brand new. Are you sure?',
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: 'Reset Everything',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          console.log('🛠️ [Reset] Starting account reset...');
                          console.log(`🛠️ [Reset] Found ${trips.length} trips to delete`);
                          
                          // Delete all trips one by one
                          const deletePromises = trips.map(trip => {
                            console.log(`🗑️ [Reset] Deleting trip: ${trip.name}`);
                            return deleteTrip(trip.id);
                          });
                          
                          await Promise.all(deletePromises);
                          console.log('✅ [Reset] All trips deleted');
                          
                          // Reset tutorial
                          await resetTutorial();
                          console.log('✅ [Reset] Tutorial reset');
                          
                          Alert.alert(
                            'Account Reset Complete',
                            'Your account has been reset! The tutorial will start automatically next time you visit the Trips tab.',
                            [
                              { 
                                text: 'OK',
                                onPress: () => {
                                  // Navigate back to main tabs and select Trips
                                  (navigation as any).navigate('MainTabs', { screen: 'Trips' });
                                }
                              }
                            ]
                          );
                        } catch (error) {
                          console.error('❌ [Reset] Failed to reset account:', error);
                          Alert.alert('Error', 'Failed to reset account. Please try again.');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Animated.View
                style={[
                  styles.languageButton,
                  { 
                    backgroundColor: animatedTheme.colors.card,
                    borderColor: theme.colors.error,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.languageContent}>
                  <Ionicons 
                    name="warning-outline" 
                    size={24} 
                    color={theme.colors.error}
                  />
                  <View style={styles.languageInfo}>
                    <Animated.Text style={[
                      styles.languageName, 
                      { color: theme.colors.error }
                    ]}>
                      {t('settings.resetAccount') || 'Reset Account'}
                    </Animated.Text>
                    <Animated.Text style={[
                      styles.languageNative, 
                      { color: animatedTheme.colors.textSecondary }
                    ]}>
                      {t('settings.resetAccountDescription') || 'Delete all trips and reset tutorial'}
                    </Animated.Text>
                  </View>
                </View>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Tutorial */}
          {isDeveloper && (
            <View style={styles.section}>
              <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>
                {t('settings.helpAndSupport') || 'Help & Support'}
              </Animated.Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    console.log('🔄 [Tutorial] Restarting tutorial...');

                    // Delete any existing tutorial trips
                    const tutorialTrips = trips.filter(t => t.id.startsWith('tutorial_trip_'));
                    console.log(`🗑️ [Tutorial] Cleaning up ${tutorialTrips.length} tutorial trips`);

                    for (const trip of tutorialTrips) {
                      await deleteTrip(trip.id);
                    }

                    // Reset tutorial state
                    await resetTutorial();
                    console.log('[Tutorial] Tutorial reset complete');

                    // Navigate to trips and start
                    (navigation as any).navigate('MainTabs', { screen: 'Trips' });
                    setTimeout(() => {
                      console.log('[Tutorial] Starting tutorial...');
                      startTutorial();
                    }, 500);
                  } catch (error) {
                    console.error(' [Tutorial] Failed to restart:', error);
                    Alert.alert('Error', 'Failed to restart tutorial. Please try again.');
                  }
                }}
              >
                <Animated.View
                  style={[
                    styles.languageButton,
                    {
                      backgroundColor: animatedTheme.colors.card,
                      borderColor: animatedTheme.colors.border
                    },
                  ]}
                >
                  <View style={styles.languageContent}>
                    <Ionicons
                      name="help-circle-outline"
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                    <View style={styles.languageInfo}>
                      <Animated.Text style={[
                        styles.languageName,
                        { color: animatedTheme.colors.text }
                      ]}>
                        {t('settings.restartTutorial') || 'Restart Tutorial'}
                      </Animated.Text>
                      <Animated.Text style={[
                        styles.languageNative,
                        { color: animatedTheme.colors.textSecondary }
                      ]}>
                        {t('settings.tutorialDescription') || 'Learn how to use the app again'}
                      </Animated.Text>
                    </View>
                  </View>
                  <Ionicons name="refresh" size={20} color={theme.colors.textSecondary} />
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {/* Language */}
          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>
              {t('settings.language')}
            </Animated.Text>
            <TouchableOpacity onPress={() => setShowLanguageModal(true)}>
              <Animated.View
                style={[
                  styles.languageButton,
                  { 
                    backgroundColor: animatedTheme.colors.card,
                    borderColor: animatedTheme.colors.border 
                  },
                ]}
              >
                <View style={styles.languageContent}>
                  <Ionicons 
                    name="language-outline" 
                    size={24} 
                    color={theme.colors.textSecondary}
                  />
                  <View style={styles.languageInfo}>
                    <Animated.Text style={[
                      styles.languageName, 
                      { color: animatedTheme.colors.text }
                    ]}>
                      {getCurrentLanguage().name}
                    </Animated.Text>
                    <Animated.Text style={[
                      styles.languageNative, 
                      { color: animatedTheme.colors.textSecondary }
                    ]}>
                      {getCurrentLanguage().nativeName}
                    </Animated.Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Language Selection Modal - Bottom Sheet */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <Pressable 
            style={{ flex: 1 }}
            onPress={dismissModal}
          />
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                backgroundColor: theme.colors.background,
                transform: [{ translateY: modalTranslateY }]
              }
            ]}
          >
            {/* Draggable Handle */}
            <Animated.View 
              {...panResponder.panHandlers}
              style={styles.handleContainer}
            >
              <Animated.View 
                style={[
                  styles.modalHandle,
                  { backgroundColor: theme.colors.border }
                ]} 
              />
            </Animated.View>

            <View style={styles.modalHeader}>
              <Animated.Text style={[
                styles.modalTitle,
                { color: theme.colors.text }
              ]}>
                {t('settings.selectLanguage')}
              </Animated.Text>
            </View>

            <ScrollView 
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}
            >
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => {
                    setLanguage(lang.code);
                    dismissModal();
                  }}
                >
                  <Animated.View
                  style={[
                  styles.optionCard,
                  { backgroundColor: theme.colors.card },
                  language === lang.code
                  ? styles.optionCardSelected
                  : styles.optionCardUnselected,
                  ]}
                  >
                  <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                  <Ionicons 
                  name="language-outline" 
                  size={24} 
                  color={language === lang.code ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <View>
                  <Animated.Text style={[
                  styles.optionText, 
                  { color: theme.colors.text }
                  ]}>
                  {lang.name}
                  </Animated.Text>
                  <Animated.Text style={[
                  styles.optionExample, 
                  { color: theme.colors.textSecondary }
                  ]}>
                  {lang.nativeName}
                  </Animated.Text>
                  </View>
                  </View>
                  {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                  </View>
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </Animated.View>
  );
}
