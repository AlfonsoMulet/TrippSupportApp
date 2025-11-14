import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
  InteractionManager,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTripStore, Trip, Stop, TransportMode } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../i18n/useTranslation';
import StopCard from '../components/StopCard';
import DraggableStopCard from '../components/DraggableStopCard';
import TransportCard from '../components/TransportCard';
import AddStopModal from '../components/AddStopModal';
import AddFriendToTripModal from '../components/AddFriendToTripModal';
import CollaborativeMembers from '../components/CollaborativeMembers';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { useTutorialStore } from '../store/tutorialStore';
import { useIsDeveloper } from '../utils/developerAccess';

// Memoized drop indicator for performance
const DropIndicator = React.memo(({ style }: { style: any }) => (
  <View style={style} />
));
DropIndicator.displayName = 'DropIndicator';

export default function TripDetailScreen() {
  const [showAddStop, setShowAddStop] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showTransport, setShowTransport] = useState(true);
  const [isLoadingTransport, setIsLoadingTransport] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoadingItinerary, setIsLoadingItinerary] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Developer-only drag state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const stopCardHeights = useRef<{ [key: number]: { y: number, height: number } }>({}).current;
  const stopAnimatedPositions = useRef<{ [key: number]: Animated.Value }>({}).current;

  // Developer-only auto-scroll state
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);
  const currentScrollY = useRef(0);
  const autoScrollSpeed = useRef(0);
  const dragStartScrollY = useRef(0);
  const scrollCompensation = useRef(0);
  const lastGestureTranslation = useRef(0);
  
  const route = useRoute();
  const navigation = useNavigation();
  const { trip: routeTrip } = route.params as { trip: Trip };
  
  const { user } = useAuthStore();
  const { trips, deleteStop, currentTrip, setCurrentTrip, updateTransportMode, getTransportSegment, regenerateAllTransportSegments, setupTripListener, cleanupTripListener, loadUserTrips, reorderStops } = useTripStore();
  const isDeveloper = useIsDeveloper();
  
  // Get the latest trip data from the store
  const trip = useMemo(() => {
    const storeTrip = trips.find(t => t.id === routeTrip.id);
    const selectedTrip = storeTrip || routeTrip;
    console.log('🔄 Trip updated:', {
      id: selectedTrip.id,
      stopCount: selectedTrip.stops.length,
      orders: selectedTrip.stops.map(s => s.order).sort((a, b) => a - b)
    });
    return selectedTrip;
  }, [trips, routeTrip.id]);
  
  // Memoize sorted stops
  const sortedStops = useMemo(() => {
    const sorted = [...trip.stops].sort((a, b) => a.order - b.order);
    console.log('📋 Sorted stops:', sorted.map(s => `${s.name} (order: ${s.order})`));
    return sorted;
  }, [trip.stops]);

  // Group stops by day
  const stopsByDay = useMemo(() => {
    const groupedStops: { [key: number]: Stop[] } = {};

    sortedStops.forEach(stop => {
      if (!groupedStops[stop.day]) {
        groupedStops[stop.day] = [];
      }
      groupedStops[stop.day].push(stop);
    });

    return groupedStops;
  }, [sortedStops]);
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { formatDate } = useSettingsStore();
  const { t } = useTranslation();
  const { isActive: tutorialActive, currentStep, steps, nextStep } = useTutorialStore();

  // Load itinerary with visible loading state for better UX
  useEffect(() => {
    setIsLoadingItinerary(true);
    setIsInitialLoad(true);
    
    const task = InteractionManager.runAfterInteractions(() => {
      // Show loading for a more noticeable duration (500-800ms)
      // This gives users feedback that content is being loaded
      setTimeout(() => {
        setIsLoadingItinerary(false);
        setIsInitialLoad(false);
      }, 600);
    });

    return () => task.cancel();
  }, [trip.id]);

  // Set up real-time listener for collaborative trips
  useEffect(() => {
    if (trip.isCollaborative) {
      setupTripListener(trip.id);
    }

    return () => {
      if (trip.isCollaborative) {
        cleanupTripListener(trip.id);
      }
    };
  }, [trip.id, trip.isCollaborative]);

  // Initialize animated positions for each stop
  useEffect(() => {
    sortedStops.forEach((_, index) => {
      if (!stopAnimatedPositions[index]) {
        stopAnimatedPositions[index] = new Animated.Value(0);
      }
    });
  }, [sortedStops.length]);

  // Keep all cards at their normal position (no slide-aside animation)
  useEffect(() => {
    // Always keep all cards at position 0
    Object.keys(stopAnimatedPositions).forEach(key => {
      stopAnimatedPositions[parseInt(key)]?.setValue(0);
    });
  }, [draggingIndex, dragTargetIndex, sortedStops.length]);

  // Cleanup auto-scroll interval on unmount
  useEffect(() => {
    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };
  }, []);

  const handleDeleteStop = (stopId: string) => {
    Alert.alert(
      t('tripDetail.deleteStop'),
      t('tripDetail.deleteStopConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => deleteStop(stopId)
        },
      ]
    );
  };

  const handleToggleTransport = async () => {
    setIsLoadingTransport(true);
    const newShowTransport = !showTransport;
    
    // Simulate loading time for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setShowTransport(newShowTransport);
    setIsLoadingTransport(false);
  };

  const handleEditStop = (stop: Stop) => {
    setEditingStop(stop);
    setShowAddStop(true);
  };

  const handleAddStopForDay = (day: number) => {
    setSelectedDay(day);
    setShowAddStop(true);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  const getRelativeTime = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past trip';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return 'This week';
    if (diffDays <= 14) return 'Next week';
    if (diffDays <= 30) return `In ${diffDays} days`;
    if (diffDays <= 60) {
      const weeks = Math.ceil(diffDays / 7);
      return `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    }
    if (diffDays <= 365) {
      const months = Math.ceil(diffDays / 30);
      return `In ${months} ${months === 1 ? 'month' : 'months'}`;
    }
    const years = Math.ceil(diffDays / 365);
    return `In ${years} ${years === 1 ? 'year' : 'years'}`;
  };

  const getTotalCost = () => {
    return trip.stops.reduce((total, stop) => total + (stop.cost || 0), 0);
  };

  const getDuration = () => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSetAsCurrent = () => {
    setCurrentTrip(trip);
    Alert.alert(t('common.success'), t('tripDetail.tripSelected', { name: trip.name }));
  };

  const getTransportToNext = (stop: Stop, index: number) => {
    const sortedStops = trip.stops.sort((a, b) => a.order - b.order);
    const nextStop = sortedStops[index + 1];

    if (!nextStop) {
      return null;
    }

    const transportSegment = getTransportSegment(trip.id, stop.id, nextStop.id);

    if (!transportSegment) {
      return {
        mode: 'driving' as TransportMode,
        distance: 0,
        duration: 30,
        toStop: nextStop,
        onModeChange: (mode: TransportMode) => {
          updateTransportMode(trip.id, stop.id, nextStop.id, mode);
        },
      };
    }

    return {
      mode: transportSegment.mode,
      distance: transportSegment.distance,
      duration: transportSegment.duration,
      toStop: nextStop,
      onModeChange: (mode: TransportMode) => {
        updateTransportMode(trip.id, stop.id, nextStop.id, mode);
      },
    };
  };

  // Developer-only: Handle layout for tracking card positions
  const handleCardLayout = (index: number, y: number, height: number) => {
    if (!isDeveloper) return;
    stopCardHeights[index] = { y, height };
  };

  // Developer-only: Drag and drop handlers
  const handleDragStart = (index: number) => {
    if (!isDeveloper) return;
    setDraggingIndex(index);
    setDragTargetIndex(index);
    // Capture the current scroll position
    dragStartScrollY.current = currentScrollY.current;
    scrollCompensation.current = 0;
    lastGestureTranslation.current = 0;
  };

  const handleDrag = (index: number, absoluteY: number, translationY: number) => {
    if (!isDeveloper) return;
    // Store the last gesture translation
    lastGestureTranslation.current = translationY;

    // Calculate target position based on how far we've dragged
    // We need to pass at least half a card height to move to the next position
    const avgCardHeight = showTransport ? 240 : 160; // Account for transport cards
    const threshold = avgCardHeight * 0.6; // 60% of card height to trigger swap

    // Calculate how many positions we've moved
    let newTargetIndex = index;

    if (Math.abs(translationY) > threshold) {
      const positionsMoved = Math.round(translationY / avgCardHeight);
      newTargetIndex = index + positionsMoved;

      // Clamp to valid range [0, sortedStops.length]
      newTargetIndex = Math.max(0, Math.min(sortedStops.length, newTargetIndex));
    }

    if (newTargetIndex !== dragTargetIndex) {
      console.log(`📍 Drag update: dragging index ${index}, target ${newTargetIndex}, translationY: ${translationY.toFixed(0)}`);
      setDragTargetIndex(newTargetIndex);
    }

    // Auto-scroll when dragging near edges with gradual speed increase
    const TOP_EDGE_THRESHOLD = 250; // Distance from top to trigger scroll (moved lower)
    const BOTTOM_EDGE_THRESHOLD = 200; // Distance from bottom to trigger scroll
    const MAX_SCROLL_SPEED = 15; // Maximum pixels to scroll per interval
    const HEADER_OFFSET = 150; // Account for header height, start scroll zone lower

    // Get screen dimensions
    const screenHeight = require('react-native').Dimensions.get('window').height;

    // Calculate scroll speed based on proximity to edge
    let scrollSpeed = 0;
    let distanceFromEdge = 0;
    let shouldScroll = false;

    // Check if near top edge (accounting for header)
    if (absoluteY < TOP_EDGE_THRESHOLD + HEADER_OFFSET) {
      distanceFromEdge = absoluteY - HEADER_OFFSET; // Distance from effective top
      if (distanceFromEdge < 0) distanceFromEdge = 0;
      // Calculate speed: closer to edge = faster (quadratic curve for smooth acceleration)
      const proximity = 1 - (distanceFromEdge / TOP_EDGE_THRESHOLD);
      scrollSpeed = -(MAX_SCROLL_SPEED * Math.pow(Math.max(0, proximity), 2)); // Negative for upward scroll
      shouldScroll = true;
    }
    // Check if near bottom edge
    else if (absoluteY > screenHeight - BOTTOM_EDGE_THRESHOLD) {
      distanceFromEdge = screenHeight - absoluteY; // Distance from bottom
      // Calculate speed: closer to edge = faster (quadratic curve for smooth acceleration)
      const proximity = 1 - (distanceFromEdge / BOTTOM_EDGE_THRESHOLD);
      scrollSpeed = MAX_SCROLL_SPEED * Math.pow(proximity, 2); // Positive for downward scroll
      shouldScroll = true;
    }

    // Update the scroll speed ref
    autoScrollSpeed.current = scrollSpeed;

    // Start interval if not already running and we should scroll
    if (shouldScroll && !autoScrollInterval.current) {
      autoScrollInterval.current = setInterval(() => {
        const speed = autoScrollSpeed.current;
        if (speed !== 0) {
          const newScrollY = speed < 0
            ? Math.max(0, currentScrollY.current + speed)
            : currentScrollY.current + speed;
          scrollViewRef.current?.scrollTo({ y: newScrollY, animated: false });
          currentScrollY.current = newScrollY;

          // Update scroll compensation continuously during auto-scroll
          scrollCompensation.current = currentScrollY.current - dragStartScrollY.current;
        }
      }, 16); // ~60fps
    }
    // Stop interval if we shouldn't scroll
    else if (!shouldScroll && autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
      autoScrollSpeed.current = 0;
    }
  };

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    if (!isDeveloper) return;
    if (draggingIndex === null) return;

    // Capture the drag state before resetting
    const finalIndex = dragTargetIndex !== null ? dragTargetIndex : toIndex;

    console.log(`🎯 Drop: moving stop from ${fromIndex} to ${finalIndex}`);

    // Reset drag state IMMEDIATELY so the card releases visually
    setDraggingIndex(null);
    setDragTargetIndex(null);

    // Clean up auto-scroll interval and reset speed
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
    autoScrollSpeed.current = 0;
    scrollCompensation.current = 0;
    lastGestureTranslation.current = 0;

    // Don't reorder if dropping in the same position
    if (fromIndex === finalIndex) {
      console.log('⏸️  No reorder needed - same position');
      return;
    }

    const reorderedStops = [...sortedStops];
    const [movedStop] = reorderedStops.splice(fromIndex, 1);

    // Insert at new position
    reorderedStops.splice(finalIndex, 0, movedStop);

    console.log(`✅ Reordered: ${reorderedStops.map(s => s.name).join(' → ')}`);

    // Update order property for all stops
    const updatedStops = reorderedStops.map((stop, idx) => ({
      ...stop,
      order: idx,
    }));

    // Call the store function to persist changes
    await reorderStops(trip.id, updatedStops);

    // Regenerate transport segments instantly after reordering
    await regenerateAllTransportSegments(trip.id);
  };

  // Define styles using theme - memoized for performance
  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 10,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    addStopButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 78,
      paddingBottom: 0,
    },
    tripInfoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tripDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 16,
    },
    tripStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      marginTop: 16,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginTop: 4,
    },
    dateRange: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    setCurrentButton: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
    },
    setCurrentButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    currentTripBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#f0fdf4',
      borderRadius: 12,
      gap: 8,
    },
    currentTripText: {
      color: theme.colors.success,
      fontSize: 16,
      fontWeight: '600',
    },
    budgetCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    budgetTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    budgetAmount: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.borderLight,
      borderRadius: 4,
      marginBottom: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    budgetRemaining: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    itinerarySection: {
      marginBottom: 0,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    editButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    editButtonTextActive: {
      color: '#fff',
    },
    transportButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    transportButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    stopsContainer: {
      gap: 0,
    },
    emptyItinerary: {
      alignItems: 'center',
      paddingVertical: 48,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 32,
    },
    addFirstStopButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    addFirstStopButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    stopCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    stopHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    orderNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    orderText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
    stopContent: {
      flex: 1,
    },
    stopName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    stopAddress: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    stopNotes: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 8,
    },
    stopMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stopCategory: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    stopSeparator: {
      fontSize: 12,
      color: theme.colors.border,
    },
    stopDay: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    stopDuration: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    stopActions: {
      flexDirection: 'row',
      gap: 8,
    },
    stopCost: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.success,
      textAlign: 'right',
    },
    daySection: {
      marginBottom: 0,
    },
    dayHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.background,
      paddingVertical: 8,
      borderRadius: 8,
    },
    dayHeader: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    addStopToDayButton: {
      padding: 4,
    },
    transportContainer: {
      alignItems: 'center',
      marginBottom: 12,
    },
    transportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    transportIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transportInfo: {
      alignItems: 'center',
    },
    transportMode: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    transportDuration: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    transportTo: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      flex: 1,
      textAlign: 'right',
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
      fontWeight: '500',
    },
    loadingSubtext: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    skeletonCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    skeletonLine: {
      height: 16,
      backgroundColor: theme.colors.border,
      borderRadius: 8,
      marginBottom: 12,
    },
    skeletonLineLarge: {
      height: 24,
      backgroundColor: theme.colors.border,
      borderRadius: 8,
      marginBottom: 16,
    },
    skeletonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    skeletonBox: {
      height: 60,
      flex: 1,
      backgroundColor: theme.colors.border,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    dropIndicator: {
      height: 4,
      backgroundColor: theme.colors.primary,
      marginHorizontal: 32,
      marginVertical: 4,
      borderRadius: 2,
      opacity: 0.8,
    },
  }), [theme, currentTrip?.id, trip.id]);

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
        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 }
          ]}
          onPress={() => {
            // If on tutorial leave-trip-detail step, advance when going back
            if (tutorialActive && steps[currentStep]?.id === 'leave-trip-detail') {
              console.log('✅ [Tutorial] User left trip detail - advancing to map step');
              navigation.goBack();
              setTimeout(() => nextStep(), 300);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        
        <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]} numberOfLines={1}>
          {trip.name}
        </Animated.Text>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={({ pressed }) => [
              styles.addStopButton,
              pressed && { opacity: 0.6 }
            ]}
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="people" size={24} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.addStopButton,
              pressed && { opacity: 0.6 }
            ]}
            onPress={() => setShowAddStop(true)}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          currentScrollY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Trip Info Card */}
        {isInitialLoad ? (
          <View style={styles.skeletonCard}>
            <View style={[styles.skeletonLineLarge, { width: '60%' }]} />
            <View style={[styles.skeletonLine, { width: '80%' }]} />
            <View style={[styles.skeletonLine, { width: '70%', marginBottom: 16 }]} />
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonBox} />
              <View style={styles.skeletonBox} />
              <View style={styles.skeletonBox} />
            </View>
            <View style={[styles.skeletonLine, { width: '100%', height: 44 }]} />
          </View>
        ) : (
        <Animated.View style={[styles.tripInfoCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
          <View style={styles.tripStats}>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{getDuration()} {t('tripDetail.days')}</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{trip.stops.length} {trip.stops.length === 1 ? t('tripList.stop') : t('tripList.stops')}</Text>
            </View>
          </View>

          <Text style={styles.dateRange}>
            {formatDateRange(trip.startDate, trip.endDate)} • {getRelativeTime(trip.startDate)}
          </Text>
        </Animated.View>
        )}

        {/* Collaborative Members */}
        {!isInitialLoad && trip.isCollaborative && user && (
          <CollaborativeMembers
            trip={trip}
            currentUserId={user.uid}
            onMemberRemoved={() => {
              loadUserTrips();
              navigation.goBack();
            }}
          />
        )}

        {/* Budget Progress */}
        {isInitialLoad && trip.budget > 0 ? (
          <View style={styles.skeletonCard}>
            <View style={[styles.skeletonLine, { width: '40%', marginBottom: 16 }]} />
            <View style={[styles.skeletonLine, { width: '100%', height: 8, marginBottom: 12 }]} />
            <View style={[styles.skeletonLine, { width: '60%', height: 12 }]} />
          </View>
        ) : trip.budget > 0 && (
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>{t('tripDetail.budgetOverview')}</Text>
              <Text style={styles.budgetAmount}>
                ${getTotalCost().toFixed(2)} / ${trip.budget.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((getTotalCost() / trip.budget) * 100, 100)}%`,
                    backgroundColor: getTotalCost() > trip.budget ? '#ef4444' : '#059669'
                  }
                ]} 
              />
            </View>
            
            <Text style={styles.budgetRemaining}>
              {getTotalCost() <= trip.budget 
                ? `${(trip.budget - getTotalCost()).toFixed(2)} ${t('tripDetail.remaining')}`
                : `${(getTotalCost() - trip.budget).toFixed(2)} ${t('tripDetail.overBudget')}`
              }
            </Text>
          </View>
        )}

        {/* Itinerary */}
        <View style={styles.itinerarySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tripDetail.tripItinerary')}</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.transportButton,
                  showTransport && styles.transportButtonActive,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleToggleTransport}
                disabled={isLoadingTransport}
              >
                {isLoadingTransport ? (
                  <ActivityIndicator size="small" color={showTransport ? "#fff" : theme.colors.text} />
                ) : (
                  <Ionicons name={showTransport ? "car" : "car-outline"} size={18} color={showTransport ? "#fff" : theme.colors.text} />
                )}
              </Pressable>
            </View>
          </View>

          {trip.stops.length > 0 ? (
            isLoadingItinerary ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="map" size={48} color={theme.colors.primary} style={{ marginBottom: 16 }} />
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('tripDetail.loadingTrip')}</Text>
                <Text style={styles.loadingSubtext}>{t('tripDetail.preparingItinerary')}</Text>
              </View>
            ) : (
              <View style={{ display: 'flex' }}>
                {Object.keys(stopsByDay)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map(day => {
                    const dayStops = stopsByDay[parseInt(day)];
                    return (
                      <View key={day} style={styles.daySection}>
                        <View style={styles.dayHeaderContainer}>
                          <Text style={styles.dayHeader}>
                            Day {day} ({dayStops.length} {dayStops.length === 1 ? t('tripList.stop') : t('tripList.stops')})
                          </Text>
                          <Pressable
                            style={({ pressed }) => [
                              styles.addStopToDayButton,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => handleAddStopForDay(parseInt(day))}
                          >
                            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                          </Pressable>
                        </View>

                        {dayStops
                          .sort((a, b) => a.order - b.order)
                          .map((stop) => {
                            const globalIndex = sortedStops.findIndex(s => s.id === stop.id);
                            const transportToNext = showTransport ? getTransportToNext(stop, globalIndex) : null;
                            const isFirstStop = globalIndex === 0;

                            return (
                              <React.Fragment key={stop.id}>
                                {/* Developer-only: Drop indicator BEFORE first card */}
                                {isDeveloper && isFirstStop &&
                                 draggingIndex !== null &&
                                 dragTargetIndex === 0 &&
                                 draggingIndex !== 0 && (
                                  <DropIndicator style={styles.dropIndicator} />
                                )}

                                <View
                                  style={{
                                    zIndex: isDeveloper && draggingIndex === globalIndex ? 10000 : 1,
                                    elevation: isDeveloper && draggingIndex === globalIndex ? 10000 : 0
                                  }}
                                >
                                  {isDeveloper ? (
                                    <DraggableStopCard
                                      stop={stop}
                                      index={globalIndex}
                                      onDelete={() => handleDeleteStop(stop.id)}
                                      onEdit={() => handleEditStop(stop)}
                                      onDragStart={handleDragStart}
                                      onDrag={handleDrag}
                                      onDragEnd={handleDragEnd}
                                      isDragging={draggingIndex === globalIndex}
                                      scrollCompensationRef={scrollCompensation}
                                      lastTranslationRef={lastGestureTranslation}
                                      animatedPosition={stopAnimatedPositions[globalIndex]}
                                      onLayout={handleCardLayout}
                                    />
                                  ) : (
                                    <StopCard
                                      stop={stop}
                                      index={globalIndex}
                                      onDelete={() => handleDeleteStop(stop.id)}
                                      onEdit={() => handleEditStop(stop)}
                                    />
                                  )}
                                </View>

                                {/* Developer-only: Drop indicator AFTER this card */}
                                {isDeveloper && draggingIndex !== null &&
                                 dragTargetIndex !== null &&
                                 draggingIndex !== dragTargetIndex &&
                                 dragTargetIndex === globalIndex + 1 && (
                                  <DropIndicator style={styles.dropIndicator} />
                                )}

                                {/* Transport card rendered separately, outside the draggable area */}
                                {transportToNext && (
                                  <View style={styles.transportContainer}>
                                    <TransportCard
                                      mode={transportToNext.mode}
                                      distance={transportToNext.distance}
                                      duration={transportToNext.duration}
                                      fromStop={stop.name}
                                      toStop={transportToNext.toStop.name}
                                      onModeChange={transportToNext.onModeChange}
                                      isCrossDay={transportToNext.toStop.day !== stop.day}
                                    />
                                  </View>
                                )}
                              </React.Fragment>
                            );
                          })
                        }
                      </View>
                    );
                  })
                }
              </View>
            )
          ) : (
            <View style={styles.emptyItinerary}>
              <Ionicons name="map-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t('tripDetail.noStopsPlanned')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('tripDetail.noStopsSubtitle')}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.addFirstStopButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => setShowAddStop(true)}
              >
                <Text style={styles.addFirstStopButtonText}>{t('tripDetail.addStop')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
        </Animated.View>
        </SafeAreaView>
      </Animated.View>

      {/* Add/Edit Stop Modal */}
      <AddStopModal
        visible={showAddStop}
        onClose={() => {
          setShowAddStop(false);
          setEditingStop(null);
          setSelectedDay(null);
        }}
        tripId={trip.id}
        editStop={editingStop}
        preselectedDay={selectedDay}
        onStopAdded={() => {
          setShowAddStop(false);
          setEditingStop(null);
          setSelectedDay(null);
        }}
      />

      {/* Add Friends to Trip Modal */}
      <AddFriendToTripModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        tripId={trip.id}
        currentSharedWith={trip.sharedWith || []}
      />

      {/* Full Screen Edit Mode - TODO: Implement FullScreenEditMode component */}
      {/* <FullScreenEditMode
        visible={isEditMode}
        stops={sortedStops}
        tripName={trip.name}
        onClose={() => setIsEditMode(false)}
        onReorder={handleReorderStops}
      /> */}

      {/* Tutorial Overlay */}
      {tutorialActive && <TutorialOverlay currentScreen="tripdetail" targetRefs={{}} />}
    </>
  );
}

