import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Pressable,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTripStore, Trip } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useTutorialStore } from '../store/tutorialStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../store/authStore';
import type { TranslationKey } from '../i18n/useTranslation';
import CreateTripModal from '../components/CreateTripModal';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { RootStackParamList } from '../navigation/AppNavigator';
import { createTutorialTrip, isTutorialTripObject } from '../utils/tutorialHelpers';

type TripListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TripList'
>;

// Memoized trip card component for performance
const TripCard = memo(({
  trip,
  isCurrentTrip,
  onPress,
  onDelete,
  theme,
  formatDate,
  t,
  cardRef,
  index,
  currentUserId,
}: {
  trip: Trip;
  isCurrentTrip: boolean;
  onPress: () => void;
  onDelete: () => void;
  theme: any;
  formatDate: (date: Date) => string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  cardRef?: React.RefObject<View | null>;
  index: number;
  currentUserId?: string;
}) => {
  const isOwner = currentUserId === trip.ownerId || currentUserId === trip.userId;
  const isCollaborative = trip.isCollaborative && trip.members && trip.members.length > 1;
  const showLeaveIcon = isOwner && isCollaborative;
  const formatDateRange = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    return `${formattedStart} - ${formattedEnd}`;
  }, [formatDate]);

  const getDaysUntilTrip = useCallback((startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return t('tripList.pastTrip');
    if (diffDays === 0) return t('tripList.today');
    if (diffDays === 1) return t('tripList.tomorrow');
    return t('tripList.inDays', { days: diffDays });
  }, [t]);

  const styles = useMemo(() => StyleSheet.create({
    tripCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: trip.isCollaborative
        ? theme.colors.success + '80'
        : isCurrentTrip
          ? theme.colors.primary
          : theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    tripHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      marginBottom: 8 
    },
    tripTitleContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      flex: 1, 
      marginRight: 12 
    },
    tripName: { 
      fontSize: 20, 
      fontWeight: '600', 
      color: theme.colors.text, 
      marginRight: 8, 
      flex: 1 
    },
    currentBadge: { 
      backgroundColor: theme.colors.primary, 
      paddingHorizontal: 8, 
      paddingVertical: 4, 
      borderRadius: 12 
    },
    currentBadgeText: { 
      color: 'white', 
      fontSize: 12, 
      fontWeight: '500' 
    },
    collaborativeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.success + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 4
    },
    collaborativeCount: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.success,
    },
    menuButton: { 
      padding: 4 
    },
    tripDescription: { 
      fontSize: 14, 
      color: theme.colors.textSecondary, 
      lineHeight: 20, 
      marginBottom: 16 
    },
    tripMeta: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      gap: 16, 
      marginBottom: 16 
    },
    metaItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 6 
    },
    metaText: { 
      fontSize: 14, 
      color: theme.colors.textSecondary 
    },
    tripFooter: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    },
    tripStatus: { 
      fontSize: 14, 
      fontWeight: '500', 
      color: theme.colors.success 
    },
  }), [theme, isCurrentTrip, trip.isCollaborative]);

  return (
    <View ref={cardRef} collapsable={false}>
    <Pressable
      style={({ pressed }) => [
        styles.tripCard,
        pressed && { opacity: 0.95, transform: [{ scale: 0.995 }] }
      ]}
      onPress={onPress}
      android_ripple={{ color: theme.colors.primary + '20' }}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripTitleContainer}>
          <Text style={styles.tripName} numberOfLines={1}>
            {trip.name}
          </Text>
          {isCurrentTrip && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{t('tripDetail.currentTrip')}</Text>
            </View>
          )}
          {trip.isCollaborative && trip.sharedWith && trip.sharedWith.length > 0 && (
            <View style={styles.collaborativeBadge}>
              <Ionicons name="people" size={14} color={theme.colors.success} />
              <Text style={styles.collaborativeCount}>
                +{trip.sharedWith.length}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showLeaveIcon ? "exit-outline" : "trash-outline"}
            size={20}
            color={theme.colors.error}
          />
        </Pressable>
      </View>

      {trip.description && (
        <Text style={styles.tripDescription} numberOfLines={2}>
          {trip.description}
        </Text>
      )}

      <View style={styles.tripMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {trip.stops.length} {trip.stops.length === 1 ? t('tripList.stop') : t('tripList.stops')}
          </Text>
        </View>

        {trip.budget > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="wallet-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>
              ${trip.budget.toLocaleString()}
            </Text>
          </View>
        )}

        {trip.isCollaborative && trip.members && trip.members.length > 1 && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>
              {trip.members.length} {trip.members.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tripFooter}>
        <Text style={styles.tripStatus}>{getDaysUntilTrip(trip.startDate)}</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </View>
    </Pressable>
    </View>
  );
});

export default function TripListScreen() {
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tutorial refs
  const [elementPositions, setElementPositions] = useState<{
    [key: string]: { x: number; y: number; width: number; height: number };
  }>({});
  const createTripFabRef = useRef<View>(null);
  const tripCardRefs = useRef<{ [key: number]: React.RefObject<View | null> }>({});
  const creationInProgressRef = useRef(false); // Prevent duplicate creation

  const navigation = useNavigation<TripListScreenNavigationProp>();
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { formatDate } = useSettingsStore();
  const { t } = useTranslation();

  const {
    trips,
    loadUserTrips,
    deleteTrip,
    setCurrentTrip,
    currentTrip,
    createTrip,
  } = useTripStore();
  
  const { 
    isActive: tutorialActive, 
    currentStep, 
    steps, 
    nextStep, 
    checkTutorialStatus 
  } = useTutorialStore();

  useEffect(() => {
    loadUserTrips();
    checkTutorialStatus();
  }, []);
  
  // No auto-creation logic - user creates their own trip!
  
  // Measure element positions for tutorial
  useEffect(() => {
    if (tutorialActive) {
      const measureElements = async () => {
        // Measure create button
        if (createTripFabRef.current) {
          createTripFabRef.current.measureInWindow((x, y, width, height) => {
            setElementPositions(prev => ({ ...prev, 'create-trip-fab': { x, y, width, height } }));
          });
        }
        
        // Measure first trip card (tutorial trip) if exists
        if (trips.length > 0 && tripCardRefs.current[0]?.current) {
          tripCardRefs.current[0].current.measureInWindow((x, y, width, height) => {
            setElementPositions(prev => ({ ...prev, 'tutorial-trip-card': { x, y, width, height } }));
          });
        }
      };

      setTimeout(measureElements, 500);
    }
  }, [tutorialActive, currentStep, trips.length]);
  
  // No auto-advance for trip creation - user clicks Next manually

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUserTrips();
    } catch (error) {
      console.error('❌ [TRIPS] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadUserTrips]);

  const handleTripPress = useCallback((trip: Trip) => {
    console.log('🎯 [Trip] Selected:', trip.name);
    setCurrentTrip(trip);
    
    // During tutorial tap-trip step, go to TripDetail then advance
    if (tutorialActive && steps[currentStep]?.action === 'tap-trip') {
      console.log('✅ [Tutorial] User tapped trip card - going to detail screen');
      navigation.navigate('TripDetail', { trip });
      setTimeout(() => nextStep(), 600);
    } else {
      navigation.navigate('TripDetail', { trip });
    }
  }, [navigation, setCurrentTrip, tutorialActive, currentStep, steps, nextStep]);

  const handleDeleteTrip = useCallback(async (trip: Trip) => {
    const { user } = useAuthStore.getState();
    const isOwner = user?.uid === trip.ownerId || user?.uid === trip.userId;
    const isCollaborative = trip.isCollaborative && trip.members && trip.members.length > 1;

    // If owner of a collaborative trip with other members, show leave option
    if (isOwner && isCollaborative) {
      Alert.alert(
        t('tripList.leaveTrip'),
        t('tripList.leaveTripConfirm', { name: trip.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('tripList.leave'),
            style: 'destructive',
            onPress: async () => {
              try {
                if (!user) return;
                // Use SharingService to leave the trip
                const { SharingService } = await import('../services/SharingService');
                const success = await SharingService.leaveCollaborativeTrip(trip.id, user.uid);
                if (success) {
                  await loadUserTrips();
                } else {
                  Alert.alert(t('common.error'), 'Failed to leave trip. Please try again.');
                }
              } catch (error) {
                console.error('❌ [TRIPS] Leave error:', error);
                Alert.alert(t('common.error'), 'Failed to leave trip. Please try again.');
              }
            },
          },
        ]
      );
    } else {
      // Regular delete for non-collaborative trips or solo collaborative trips
      Alert.alert(
        t('tripList.deleteTrip'),
        t('tripList.deleteTripConfirm', { name: trip.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTrip(trip.id);
              } catch (error) {
                console.error('❌ [TRIPS] Delete error:', error);
                Alert.alert(t('common.error'), 'Failed to delete trip. Please try again.');
              }
            },
          },
        ]
      );
    }
  }, [deleteTrip, loadUserTrips, t]);

  const renderTripCard = useCallback(({ item: trip, index }: { item: Trip; index: number }) => {
    const { user } = useAuthStore.getState();
    const isCurrentTrip = currentTrip?.id === trip.id;

    // Create ref for this trip card if it doesn't exist
    if (!tripCardRefs.current[index]) {
      tripCardRefs.current[index] = React.createRef<View>();
    }

    return (
      <TripCard
        trip={trip}
        isCurrentTrip={isCurrentTrip}
        onPress={() => handleTripPress(trip)}
        onDelete={() => handleDeleteTrip(trip)}
        theme={theme}
        formatDate={formatDate}
        t={t}
        cardRef={tripCardRefs.current[index]}
        index={index}
        currentUserId={user?.uid}
      />
    );
  }, [currentTrip, handleTripPress, handleDeleteTrip, theme, formatDate, t]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="map-outline" size={64} color={theme.colors.border} />
      <Text style={styles.emptyTitle}>{t('tripList.noTrips')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('tripList.noTripsSubtitle')}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.createFirstTripButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => setShowCreateTrip(true)}
      >
        <Text style={styles.createFirstTripButtonText}>{t('tripList.createTrip')}</Text>
      </Pressable>
    </View>
  ), [theme, t]);

  const keyExtractor = useCallback((item: Trip) => item.id, []);

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: { 
      flex: 1, 
      backgroundColor: theme.colors.background 
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
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
      color: theme.colors.text 
    },
    addButton: { 
      backgroundColor: theme.colors.primary, 
      padding: 12, 
      borderRadius: 12 
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 90,
      paddingBottom: 75
    },
    listContainerEmpty: { 
      flex: 1, 
      justifyContent: 'center' 
    },
    emptyState: { 
      alignItems: 'center', 
      paddingVertical: 48 
    },
    emptyTitle: { 
      fontSize: 20, 
      fontWeight: '600', 
      color: theme.colors.text, 
      marginTop: 16, 
      marginBottom: 8 
    },
    emptySubtitle: { 
      fontSize: 16, 
      color: theme.colors.textSecondary, 
      textAlign: 'center', 
      marginBottom: 24, 
      paddingHorizontal: 32 
    },
    createFirstTripButton: { 
      backgroundColor: theme.colors.primary, 
      paddingHorizontal: 32, 
      paddingVertical: 16, 
      borderRadius: 12 
    },
    createFirstTripButtonText: { 
      color: 'white', 
      fontSize: 16, 
      fontWeight: '600' 
    },
  }), [theme]);

  return (
    <>
      <StatusBar 
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      <Animated.View style={[styles.safeArea, { backgroundColor: animatedTheme.colors.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <Animated.View style={[styles.container, { backgroundColor: animatedTheme.colors.background }]}>
          {/* Header */}
          <Animated.View style={[styles.header, { backgroundColor: animatedTheme.colors.background }]}>
            <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]}>{t('tripList.title')}</Animated.Text>
            <View ref={createTripFabRef} collapsable={false}>
              <Pressable 
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] }
                ]}
                onPress={() => {
                  setShowCreateTrip(true);
                  // Advance tutorial if on tap-create step
                  if (tutorialActive && steps[currentStep]?.action === 'tap-create') {
                    console.log('✅ [Tutorial] User tapped create button');
                    setTimeout(() => nextStep(), 300);
                  }
                }}
              >
                <Ionicons name="add" size={24} color="white" />
              </Pressable>
            </View>
          </Animated.View>

          {/* Trip List */}
          <FlatList
            data={trips}
            renderItem={renderTripCard}
            keyExtractor={keyExtractor}
            contentContainerStyle={[
              styles.listContainer,
              trips.length === 0 && styles.listContainerEmpty,
            ]}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh} 
                tintColor={theme.colors.primary} 
              />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            windowSize={21}
            updateCellsBatchingPeriod={50}
          />
        </Animated.View>
        
        {/* Tutorial Overlay */}
        {tutorialActive && <TutorialOverlay currentScreen="triplist" targetRefs={elementPositions} />}
        </SafeAreaView>
      </Animated.View>

      {/* Create Trip Modal */}
      <CreateTripModal
        visible={showCreateTrip}
        onClose={() => setShowCreateTrip(false)}
        isTutorial={tutorialActive && steps[currentStep]?.action === 'wait-for-trip'}
        onTripCreated={async (trip) => {
          setCurrentTrip(trip);
          setShowCreateTrip(false);
          
          // If tutorial, auto-add 2 stops
          if (tutorialActive && steps[currentStep]?.action === 'wait-for-trip') {
            console.log('✅ [Tutorial] User created trip - adding 2 stops automatically');
            
            try {
              const { addStop } = useTripStore.getState();
              
              // Add first stop: Tokyo Tower
              await addStop(trip.id, {
                name: 'Tokyo Tower',
                lat: 35.6586,
                lng: 139.7454,
                address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan',
                order: 0,
                day: 1,
                notes: 'Amazing views of the city!',
                category: 'sightseeing',
                estimatedTime: 120,
              });
              
              // Add second stop: Shibuya Crossing
              await addStop(trip.id, {
                name: 'Shibuya Crossing',
                lat: 35.6595,
                lng: 139.7004,
                address: '2 Chome-2-1 Dogenzaka, Shibuya City, Tokyo 150-0043, Japan',
                order: 1,
                day: 1,
                notes: 'Busiest intersection in the world!',
                category: 'sightseeing',
                estimatedTime: 60,
              });
              
              console.log('✅ [Tutorial] Added 2 stops successfully');
              
              // Reload the trip to get updated stops
              await loadUserTrips();
              
              // Find and set the updated trip
              const { trips } = useTripStore.getState();
              const updatedTrip = trips.find(t => t.id === trip.id);
              if (updatedTrip) {
                setCurrentTrip(updatedTrip);
              }
            } catch (error) {
              console.error('❌ [Tutorial] Failed to add stops:', error);
            }
            
            setTimeout(() => nextStep(), 500);
          } else {
            handleTripPress(trip);
          }
        }}
      />
    </>
  );
}
