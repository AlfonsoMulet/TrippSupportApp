import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  Animated,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useTutorialStore } from '../store/tutorialStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsDeveloper } from '../utils/developerAccess';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const {
    isTrialActive,
    daysRemainingInTrial,
    hasActiveSubscription,
    subscriptionType,
    resetSubscription,
    cancelSubscription,
  } = useSubscriptionStore();
  const animatedTheme = useAnimatedTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isActive: tutorialActive, currentStep, steps } = useTutorialStore();
  const isDeveloper = useIsDeveloper();
  
  // Tutorial refs
  const [elementPositions, setElementPositions] = useState<{
    [key: string]: { x: number; y: number; width: number; height: number };
  }>({});
  const settingsButtonRef = useRef<View>(null);

  const handleLogout = () => {
    Alert.alert(
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const handleResetSubscription = () => {
    Alert.alert(
      'Reset Subscription (DEV)',
      'This will clear all subscription data and restart the trial. Only for testing!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetSubscription();
              Alert.alert('Success', 'Subscription reset! Close and reopen the app to start a new trial.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset subscription');
            }
          },
        },
      ]
    );
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled. You will lose access to premium features.');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };
  
  // Measure element positions for tutorial
  useEffect(() => {
    if (tutorialActive) {
      const measureElements = async () => {
        if (settingsButtonRef.current) {
          settingsButtonRef.current.measureInWindow((x, y, width, height) => {
            setElementPositions(prev => ({ ...prev, 'settings-button': { x, y, width, height } }));
          });
        }
      };

      setTimeout(measureElements, 500);
    }
  }, [tutorialActive, currentStep]);

  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport' as never);
  };

  const handleAbout = () => {
    navigation.navigate('About' as never);
  };

  // Load display name from Firestore
  useEffect(() => {
    const loadDisplayName = async () => {
      if (!user?.uid) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().displayName) {
          setDisplayName(userDoc.data().displayName);
        } else {
          // Default to email prefix
          setDisplayName(user.email?.split('@')[0] || '');
        }
      } catch (error) {
        console.error('Error loading display name:', error);
        setDisplayName(user.email?.split('@')[0] || '');
      }
    };

    loadDisplayName();
  }, [user?.uid, user?.email]);

  const handleSaveDisplayName = async () => {
    if (!user?.uid || !displayName.trim()) return;

    setIsSavingName(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
      });
      setIsEditingName(false);
      Alert.alert('Success', 'Display name updated!');
    } catch (error) {
      console.error('Error saving display name:', error);
      Alert.alert('Error', 'Failed to update display name');
    } finally {
      setIsSavingName(false);
    }
  };

  const menuItems = [
    {
      icon: 'moon-outline',
      title: t('profile.darkMode'),
      subtitle: t('profile.darkModeSubtitle'),
      onPress: () => {},
      isToggle: true,
      toggleValue: theme.mode === 'dark',
      onToggle: toggleTheme,
    },
    {
      icon: 'settings-outline',
      title: t('profile.settings'),
      subtitle: t('profile.settingsSubtitle'),
      onPress: () => navigation.navigate('Settings' as never),
    },
    {
      icon: 'help-circle-outline',
      title: t('profile.helpSupport'),
      subtitle: t('profile.helpSupportSubtitle'),
      onPress: handleHelpSupport,
    },
    {
      icon: 'information-circle-outline',
      title: t('profile.about'),
      subtitle: t('profile.aboutSubtitle'),
      onPress: handleAbout,
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 22,
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.07,
      shadowRadius: 8,
      elevation: 12,
      zIndex: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    userCard: {
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 4,
      textTransform: 'capitalize',
    },
    userEmail: {
      fontSize: 16,
    },
    nameInput: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    menuContainer: {
      marginBottom: 24,
    },
    menuItem: {
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      borderWidth: 1,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    menuContent: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 14,
    },
    logoutContainer: {
      marginBottom: 32,
    },
    logoutButton: {
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? '#dc2626' : '#fecaca',
      gap: 8,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.error,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    footerText: {
      fontSize: 14,
      marginBottom: 4,
    },
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedTheme.colors.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <Animated.View style={[styles.header, { backgroundColor: animatedTheme.colors.background }]}>
          <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]}>
            {t('profile.title')}
          </Animated.Text>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Card */}
          <Animated.View style={[styles.userCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
            <Animated.View style={[styles.avatar, { backgroundColor: animatedTheme.colors.surface }]}>
              <Ionicons name="person" size={32} color={theme.colors.primary} />
            </Animated.View>
            
            <View style={styles.userInfo}>
              {isEditingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.textSecondary}
                    autoFocus
                    maxLength={30}
                  />
                  {isSavingName ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <TouchableOpacity onPress={handleSaveDisplayName}>
                        <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setIsEditingName(false);
                        setDisplayName(user?.email?.split('@')[0] || '');
                      }}>
                        <Ionicons name="close-circle" size={28} color={theme.colors.error} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Animated.Text style={[styles.userName, { color: animatedTheme.colors.text }]}>
                    {displayName || user?.email?.split('@')[0] || 'User'}
                  </Animated.Text>
                  <TouchableOpacity onPress={() => setIsEditingName(true)}>
                    <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
              <Animated.Text style={[styles.userEmail, { color: animatedTheme.colors.textSecondary }]}>
                {user?.email}
              </Animated.Text>
            </View>
          </Animated.View>

          {/* Subscription Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Paywall' as never)}
          >
            <Animated.View
              style={[
                styles.userCard,
                {
                  backgroundColor: hasActiveSubscription
                    ? theme.mode === 'dark'
                      ? '#15803d'
                      : '#dcfce7'
                    : isTrialActive
                    ? theme.mode === 'dark'
                      ? '#1e40af'
                      : '#dbeafe'
                    : animatedTheme.colors.card,
                  borderColor: hasActiveSubscription
                    ? '#16a34a'
                    : isTrialActive
                    ? theme.colors.primary
                    : theme.colors.warning,
                  borderWidth: 2,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: hasActiveSubscription
                      ? '#16a34a'
                      : isTrialActive
                      ? theme.colors.primary
                      : theme.colors.warning,
                  },
                ]}
              >
                <Ionicons
                  name={
                    hasActiveSubscription
                      ? 'checkmark-circle'
                      : isTrialActive
                      ? 'time-outline'
                      : 'lock-closed-outline'
                  }
                  size={32}
                  color="white"
                />
              </Animated.View>

              <View style={styles.userInfo}>
                <Animated.Text
                  style={[
                    styles.userName,
                    {
                      color: hasActiveSubscription
                        ? '#16a34a'
                        : isTrialActive
                        ? theme.colors.primary
                        : animatedTheme.colors.text,
                    },
                  ]}
                >
                  {hasActiveSubscription
                    ? subscriptionType === 'yearly'
                      ? 'Pro - Yearly'
                      : 'Pro - Monthly'
                    : isTrialActive
                    ? `Trial - ${daysRemainingInTrial} days left`
                    : 'Free'}
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.userEmail,
                    {
                      color: hasActiveSubscription
                        ? theme.mode === 'dark'
                          ? '#86efac'
                          : '#15803d'
                        : isTrialActive
                        ? theme.mode === 'dark'
                          ? '#93c5fd'
                          : '#1e40af'
                        : animatedTheme.colors.textSecondary,
                    },
                  ]}
                >
                  {hasActiveSubscription
                    ? 'All premium features unlocked'
                    : isTrialActive
                    ? 'Tap to upgrade before trial ends'
                    : 'Tap to unlock premium features'}
                </Animated.Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={24}
                color={
                  hasActiveSubscription
                    ? '#16a34a'
                    : isTrialActive
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Cancel Subscription Button - Only show if user has active subscription */}
          {hasActiveSubscription && (
            <View style={{ marginBottom: 24 }}>
              <TouchableOpacity onPress={handleCancelSubscription}>
                <Animated.View
                  style={[
                    styles.logoutButton,
                    {
                      backgroundColor: animatedTheme.colors.card,
                      borderColor: theme.colors.error,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons name="close-circle-outline" size={20} color={theme.colors.error} />
                  <Animated.Text style={[styles.logoutText, { color: theme.colors.error }]}>
                    Cancel Subscription
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>
              {t('profile.app')}
            </Animated.Text>
            
            {menuItems.map((item, index) => (
              <View 
                key={index}
                ref={item.title === t('profile.settings') ? settingsButtonRef : null}
                collapsable={false}
              >
              <TouchableOpacity
                onPress={item.isToggle ? undefined : item.onPress}
              >
                <Animated.View style={[styles.menuItem, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
                  <Animated.View style={[styles.menuIcon, { backgroundColor: animatedTheme.colors.borderLight }]}>
                    <Ionicons name={item.icon as any} size={24} color={theme.colors.textSecondary} />
                  </Animated.View>
                  
                  <View style={styles.menuContent}>
                    <Animated.Text style={[styles.menuTitle, { color: animatedTheme.colors.text }]}>{item.title}</Animated.Text>
                    <Animated.Text style={[styles.menuSubtitle, { color: animatedTheme.colors.textSecondary }]}>{item.subtitle}</Animated.Text>
                  </View>
                  
                  {item.isToggle ? (
                    <Switch
                      value={item.toggleValue}
                      onValueChange={item.onToggle}
                      trackColor={{ false: theme.colors.borderLight, true: theme.colors.primary }}
                      thumbColor={item.toggleValue ? theme.colors.surface : theme.colors.textTertiary}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                  )}
                </Animated.View>
              </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Dev: Reset Subscription */}
          {isDeveloper && (
            <View style={styles.logoutContainer}>
              <TouchableOpacity onPress={handleResetSubscription}>
                <Animated.View
                  style={[
                    styles.logoutButton,
                    {
                      backgroundColor: animatedTheme.colors.card,
                      borderColor: theme.colors.warning,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={20} color={theme.colors.warning} />
                  <Animated.Text style={[styles.logoutText, { color: theme.colors.warning }]}>
                    Reset Subscription (DEV)
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {/* Logout */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity onPress={handleLogout}>
              <Animated.View style={[styles.logoutButton, { backgroundColor: animatedTheme.colors.card }]}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                <Animated.Text style={styles.logoutText}>{t('profile.signOut')}</Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Animated.Text style={[styles.footerText, { color: animatedTheme.colors.textTertiary }]}>
              {t('profile.version')}
            </Animated.Text>
            <Animated.Text style={[styles.footerText, { color: animatedTheme.colors.textTertiary }]}>
              {t('profile.madeWith')}
            </Animated.Text>
          </View>
        </ScrollView>
        
        {/* Tutorial Overlay */}
        {tutorialActive && <TutorialOverlay currentScreen="profile" targetRefs={elementPositions} />}
      </SafeAreaView>
    </Animated.View>
  );
}
