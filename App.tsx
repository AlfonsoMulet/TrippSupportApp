import './src/config/firebase';

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, ActivityIndicator, Linking, Animated as RNAnimated, Easing } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { useSubscriptionStore } from './src/store/subscriptionStore';
import useCachedResources from './src/hooks/useCachedResources';
import { ThemeAnimationProvider, useAnimatedTheme } from './src/contexts/ThemeAnimationContext';
import { useTranslation } from './src/i18n/useTranslation';

import AuthScreen from './src/screens/AuthScreen';
import MapScreen from './src/screens/MapScreen';
import TripListScreen from './src/screens/TripListScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AcceptTripScreen from './src/screens/AcceptTripScreen';
import PaywallScreen from './src/screens/PaywallScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FadeScreen = ({ children }: { children: React.ReactNode }) => {
  const { useIsFocused } = require('@react-navigation/native');
  const isFocused = useIsFocused();
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const fadeAnim = React.useRef(new RNAnimated.Value(1)).current;

  React.useEffect(() => {
    if (isFocused) {
      fadeAnim.setValue(0);
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [isFocused]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <RNAnimated.View 
        style={{
          flex: 1, 
          opacity: fadeAnim,
        }}
      >
        {children}
      </RNAnimated.View>
    </View>
  );
};

function MainTabs() {
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          
          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Trips') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarBackground: () => (
          <RNAnimated.View style={{ 
            flex: 1, 
            backgroundColor: animatedTheme.colors.surface 
          }} />
        ),
        tabBarStyle: {
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'android' ? 4 : 8,
          paddingTop: 6,
          height: Platform.OS === 'android' ? 65 : 75,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.1,
          shadowRadius: 8,
        },
        headerShown: false,
        lazy: false,
        unmountOnBlur: false,
        sceneContainerStyle: {
          backgroundColor: theme.colors.background,
        },
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
      })}
    >
      <Tab.Screen 
        name="Map" 
        options={{ tabBarLabel: t('navigation.map') }}
      >
        {() => (
          <FadeScreen>
            <MapScreen />
          </FadeScreen>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Trips"
        options={{ tabBarLabel: t('navigation.trips') }}
      >
        {() => (
          <FadeScreen>
            <TripListScreen />
          </FadeScreen>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Friends"
        options={{ tabBarLabel: t('navigation.friends') }}
      >
        {() => (
          <FadeScreen>
            <FriendsScreen />
          </FadeScreen>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{ tabBarLabel: t('navigation.profile') }}
      >
        {() => (
          <FadeScreen>
            <ProfileScreen />
          </FadeScreen>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading, initializeAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const {
    initializeSubscription,
    startTrial,
    isTrialActive,
    hasActiveSubscription,
    isLoading: subscriptionLoading,
  } = useSubscriptionStore();
  const navigationRef = React.useRef<any>(null);
  const isLoadingComplete = useCachedResources();
  const [showPaywallLock, setShowPaywallLock] = React.useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initialize();
    
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setBackgroundColorAsync('transparent');
    }

    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      const match = url.match(/tripplanner:\/\/share\/(.+)/);
      
      if (match && match[1] && navigationRef.current) {
        navigationRef.current.navigate('AcceptTrip', { token: match[1] });
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  // Initialize subscription when user logs in
  useEffect(() => {
    const initSubscription = async () => {
      if (user) {
        await initializeSubscription();

        // Check if this is first time user - start trial
        const { trialStartDate, hasActiveSubscription } = useSubscriptionStore.getState();
        if (!trialStartDate && !hasActiveSubscription) {
          console.log('🎉 [Subscription] Starting trial for new user');
          await startTrial();
        }
      }
    };

    initSubscription();
  }, [user]);

  // Check subscription status and lock app if needed
  useEffect(() => {
    if (user && !subscriptionLoading) {
      const hasAccess = isTrialActive || hasActiveSubscription;
      setShowPaywallLock(!hasAccess);

      if (!hasAccess) {
        console.log('🔒 [Subscription] Trial expired and no active subscription - locking app');
      }
    }
  }, [user, subscriptionLoading, isTrialActive, hasActiveSubscription]);
  
  if (loading || !isLoadingComplete) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: theme.colors.background
          }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ 
              fontSize: 18, 
              color: theme.colors.text, 
              textAlign: 'center',
              fontWeight: '600',
              marginTop: 16
            }}>
              Loading...
            </Text>
          </View>
          <StatusBar 
            style={theme.mode === 'dark' ? 'light' : 'dark'} 
            translucent 
            backgroundColor="transparent" 
            animated
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  const linking = {
    prefixes: ['tripplanner://', 'https://tripplanner.app'],
    config: {
      screens: {
        Auth: 'auth',
        MainTabs: {
          path: 'home',
          screens: {
            Map: 'map',
            Trips: 'trips',
            Friends: 'friends',
            Profile: 'profile',
          },
        },
        TripDetail: 'trip/:tripId',
        AcceptTrip: 'share/:token',
      },
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeAnimationProvider>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <Stack.Navigator 
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 250,
                contentStyle: {
                  backgroundColor: theme.colors.background,
                },
              }}
            >
              {user ? (
                <>
                  {showPaywallLock ? (
                    <Stack.Screen
                      name="PaywallLock"
                      component={PaywallScreen}
                      options={{
                        headerShown: false,
                        gestureEnabled: false,
                      }}
                    />
                  ) : (
                    <>
                      <Stack.Screen name="MainTabs" component={MainTabs} />
                      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
                      <Stack.Screen name="Settings" component={SettingsScreen} />
                      <Stack.Screen name="About" component={AboutScreen} />
                      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
                      <Stack.Screen name="AcceptTrip" component={AcceptTripScreen} />
                      <Stack.Screen
                        name="Paywall"
                        component={PaywallScreen}
                        options={{
                          presentation: 'modal',
                          animation: 'slide_from_bottom',
                        }}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <Stack.Screen name="Auth" component={AuthScreen} />
                  <Stack.Screen name="AcceptTrip" component={AcceptTripScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeAnimationProvider>
        <StatusBar 
          style={theme.mode === 'dark' ? 'light' : 'dark'} 
          translucent 
          backgroundColor="transparent" 
          animated
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
