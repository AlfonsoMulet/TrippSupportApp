import React, { useState, useRef, useEffect, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  FlatList,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Region, LatLng } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useTripStore, Stop, TransportMode } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useTutorialStore } from '../store/tutorialStore';
import CreateTripModal from '../components/CreateTripModal';
import AddStopModal from '../components/AddStopModal';
import SlidingPanel, { SlidingPanelPosition } from '../components/SlidingPanel';
import StopCard from '../components/StopCard';
import TransportCard from '../components/TransportCard';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { useSimpleRouteStore, SimpleTransportMode } from '../store/routeStore';
import { useTranslation } from '../i18n/useTranslation';
import { LocationService } from '../services/LocationService';
import { AirportService } from '../services/AirportService';

const { width, height } = Dimensions.get('window');

// Vehicle-specific route colors
const VEHICLE_ROUTE_COLORS = {
  driving: '#2563eb',    // Blue for cars
  walking: '#10b981',   // Green for walking  
  bicycling: '#8b5cf6', // Purple for cycling
  flight: '#ef4444',    // Red for flights
};

export default function MapScreen() {
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showEditStop, setShowEditStop] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [showTransport, setShowTransport] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [panelPosition, setPanelPosition] = useState<SlidingPanelPosition>('mid');
  
  const [currentLocation, setCurrentLocation] = useState<Region | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [routeLines, setRouteLines] = useState<Array<{
    coordinates: LatLng[];
    color: string;
    mode: TransportMode;
    duration: number; // in seconds
    fromStopId: string;
    toStopId: string;
  }>>([]);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // Tutorial refs and positions
  const [elementPositions, setElementPositions] = useState<{
    [key: string]: { x: number; y: number; width: number; height: number };
  }>({});
  const createTripButtonRef = useRef<View>(null);
  const menuButtonRef = useRef<View>(null);
  const addStopButtonRef = useRef<View>(null);
  const transportButtonRef = useRef<View>(null);
  const editButtonRef = useRef<View>(null);
  const locateButtonRef = useRef<View>(null);
  
  const mapRef = useRef<MapView>(null);
  const hasAdvancedTutorial = useRef(false);
  const editScrollViewRef = useRef<ScrollView>(null);
  const currentScrollY = useRef(0);
  
  const {
    trips,
    currentTrip,
    setCurrentTrip,
    loadUserTrips,
    deleteStop,
    updateStop,
    updateTransportMode,
    getTransportSegment,
    regenerateAllTransportSegments,
    loading
  } = useTripStore();
  
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { requestRoute, loadingRoutes } = useSimpleRouteStore();
  const { t } = useTranslation();
  const { isActive: tutorialActive, currentStep, steps, nextStep, checkTutorialStatus } = useTutorialStore();

  useEffect(() => {
    loadUserTrips();
    getCurrentLocation();
    checkTutorialStatus();
  }, []);

  // Auto-advance tutorial when user navigates to Map screen
  useEffect(() => {
    if (tutorialActive && !hasAdvancedTutorial.current) {
      const currentStepData = steps[currentStep];
      
      // If user navigated to map during the navigate-to-map step, advance immediately
      if (currentStepData.action === 'navigate-to-map' && currentStepData.screen === 'triplist') {
        hasAdvancedTutorial.current = true;
        setTimeout(() => nextStep(), 300);
      }
    }
    
    // Reset flag when step changes
    if (tutorialActive) {
      const currentStepData = steps[currentStep];
      if (currentStepData.action !== 'navigate-to-map') {
        hasAdvancedTutorial.current = false;
      }
    }
  }, [tutorialActive, currentStep]);

  useEffect(() => {
    if (currentTrip && currentTrip.stops && currentTrip.stops.length > 1 && showRoutes) {
      generateRoutesFromTransportSegments();
    } else {
      setRouteLines([]);
    }
  }, [currentTrip, showRoutes]);

  // Measure element positions for tutorial
  useEffect(() => {
    if (tutorialActive) {
      const measureElements = async () => {
        const refs = {
          'create-trip-button': createTripButtonRef,
          'menu-button': menuButtonRef,
          'add-stop-button': addStopButtonRef,
          'transport-button': transportButtonRef,
          'edit-button': editButtonRef,
          'locate-button': locateButtonRef,
        };

        const positions: typeof elementPositions = {};

        for (const [key, ref] of Object.entries(refs)) {
          if (ref.current) {
            ref.current.measureInWindow((x, y, width, height) => {
              positions[key] = { x, y, width, height };
              setElementPositions(prev => ({ ...prev, [key]: { x, y, width, height } }));
            });
          }
        }
      };

      // Delay to ensure layout is complete
      setTimeout(measureElements, 500);
    }
  }, [tutorialActive, currentStep, currentTrip, panelPosition]);

  // Handle tutorial actions - only for add-stop action
  useEffect(() => {
    if (!tutorialActive) return;

    const currentStepData = steps[currentStep];
    
    // Auto-advance only when user adds a stop
    if (currentStepData.action === 'wait-for-stop' && currentTrip && currentTrip.stops && currentTrip.stops.length > 0) {
      setTimeout(() => nextStep(), 500);
    }
  }, [tutorialActive, currentStep, currentTrip?.stops?.length]);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission required');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setCurrentLocation(region);
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const generateRoutesFromTransportSegments = async () => {
    if (!currentTrip?.stops || currentTrip.stops.length < 2) return;
    
    const sortedStops = getSortedStops(currentTrip.stops);
    const newRouteLines: Array<{
      coordinates: LatLng[];
      color: string;
      mode: TransportMode;
      duration: number;
      fromStopId: string;
      toStopId: string;
    }> = [];

    console.log('Generating routes for', sortedStops.length, 'stops');

    for (let i = 0; i < sortedStops.length - 1; i++) {
      const fromStop = sortedStops[i];
      const toStop = sortedStops[i + 1];
      
      // Get the actual transport segment chosen by the user
      const transportSegment = getTransportSegment(currentTrip.id, fromStop.id, toStop.id);
      
      // If no segment exists, create a fallback with realistic routing
      if (!transportSegment) {
        console.warn(`No transport segment found for ${fromStop.name} to ${toStop.name} - creating fallback`);
        
        // Try to get realistic route
        try {
          const routeResult = await requestRoute({
            id: `fallback_route_${i}`,
            origin: { lat: fromStop.lat, lng: fromStop.lng },
            destination: { lat: toStop.lat, lng: toStop.lng },
            mode: 'driving',
            realistic: true,
          });

          if (routeResult) {
            newRouteLines.push({
              coordinates: routeResult.coordinates,
              color: VEHICLE_ROUTE_COLORS.driving,
              mode: 'driving',
              duration: 0,
              fromStopId: fromStop.id,
              toStopId: toStop.id,
            });
          }
        } catch (error) {
          // Last resort: straight line
          newRouteLines.push({
            coordinates: [
              { latitude: fromStop.lat, longitude: fromStop.lng },
              { latitude: toStop.lat, longitude: toStop.lng },
            ],
            color: VEHICLE_ROUTE_COLORS.driving,
            mode: 'driving',
            duration: 0,
            fromStopId: fromStop.id,
            toStopId: toStop.id,
          });
        }
        continue;
      }
      
      const mode = transportSegment.mode;
      const color = VEHICLE_ROUTE_COLORS[mode] || VEHICLE_ROUTE_COLORS.driving;
      const duration = transportSegment.duration;
      
      console.log(`Route ${i + 1}: ${fromStop.name} to ${toStop.name}`);
      console.log(`Mode: ${mode}, Duration: ${duration}s (${Math.round(duration/60)}min), Distance: ${transportSegment.distance}m`);
      
      // SPECIAL HANDLING FOR FLIGHTS WITH AIRPORT ROUTING
      if (mode === 'flight') {
        const complexRoute = AirportService.createComplexFlightRoute(
          { name: fromStop.name, lat: fromStop.lat, lng: fromStop.lng },
          { name: toStop.name, lat: toStop.lat, lng: toStop.lng }
        );

        // Add each segment of the complex route
        for (const segment of complexRoute.segments) {
          const segmentColor = segment.type === 'flight' ? VEHICLE_ROUTE_COLORS.flight : VEHICLE_ROUTE_COLORS.driving;
          
          if (segment.type === 'flight') {
            // Calculate distance in kilometers
            const distanceKm = LocationService.calculateDistance(
              { latitude: segment.from.lat, longitude: segment.from.lng },
              { latitude: segment.to.lat, longitude: segment.to.lng }
            );
            
            // Calculate curve factor based on distance (more curve for longer flights)
            // distanceKm is in kilometers, so we adjust the formula
            // Reduced values for subtle curves: max 0.05 with smaller multiplier
            const curveFactor = Math.min(0.005, distanceKm / 1000 * 0.02);
            
            // Generate curved path for flight with distance-based curve
            const curvedPath = AirportService.generateFlightCurvePath(
              segment.from.lat,
              segment.from.lng,
              segment.to.lat,
              segment.to.lng,
              30,
              curveFactor
            );
            
            newRouteLines.push({
              coordinates: curvedPath,
              color: segmentColor,
              mode: 'flight',
              duration: segment.duration,
              fromStopId: fromStop.id,
              toStopId: toStop.id,
            });
          } else {
            // Car segments (to/from airports) - use realistic routing
            if (segment.needsRealisticRoute) {
              try {
                const carRouteResult = await requestRoute({
                  id: `airport_car_${i}`,
                  origin: { lat: segment.from.lat, lng: segment.from.lng },
                  destination: { lat: segment.to.lat, lng: segment.to.lng },
                  mode: 'driving',
                  realistic: true,
                });

                if (carRouteResult) {
                  newRouteLines.push({
                    coordinates: carRouteResult.coordinates,
                    color: segmentColor,
                    mode: 'driving',
                    duration: segment.duration,
                    fromStopId: fromStop.id,
                    toStopId: toStop.id,
                  });
                } else {
                  // Fallback to straight line
                  newRouteLines.push({
                    coordinates: [
                      { latitude: segment.from.lat, longitude: segment.from.lng },
                      { latitude: segment.to.lat, longitude: segment.to.lng },
                    ],
                    color: segmentColor,
                    mode: 'driving',
                    duration: segment.duration,
                    fromStopId: fromStop.id,
                    toStopId: toStop.id,
                  });
                }
              } catch (error) {
                // Fallback to straight line
                newRouteLines.push({
                  coordinates: [
                    { latitude: segment.from.lat, longitude: segment.from.lng },
                    { latitude: segment.to.lat, longitude: segment.to.lng },
                  ],
                  color: segmentColor,
                  mode: 'driving',
                  duration: segment.duration,
                  fromStopId: fromStop.id,
                  toStopId: toStop.id,
                });
              }
            } else {
              // Straight line fallback
              newRouteLines.push({
                coordinates: [
                  { latitude: segment.from.lat, longitude: segment.from.lng },
                  { latitude: segment.to.lat, longitude: segment.to.lng },
                ],
                color: segmentColor,
                mode: 'driving',
                duration: segment.duration,
                fromStopId: fromStop.id,
                toStopId: toStop.id,
              });
            }
          }
        }
      } 
      // HANDLING FOR OTHER TRANSPORT MODES - Always use realistic routes
      else {
        try {
          const routeResult = await requestRoute({
            id: `route_${i}`,
            origin: { lat: fromStop.lat, lng: fromStop.lng },
            destination: { lat: toStop.lat, lng: toStop.lng },
            mode: mode as SimpleTransportMode,
            realistic: true,
          });

          if (routeResult) {
            newRouteLines.push({
              coordinates: routeResult.coordinates,
              color,
              mode,
              duration,
              fromStopId: fromStop.id,
              toStopId: toStop.id,
            });
          } else {
            // Fallback to straight line
            newRouteLines.push({
              coordinates: [
                { latitude: fromStop.lat, longitude: fromStop.lng },
                { latitude: toStop.lat, longitude: toStop.lng },
              ],
              color,
              mode,
              duration,
              fromStopId: fromStop.id,
              toStopId: toStop.id,
            });
          }
        } catch (error) {
          // Fallback to straight line if routing fails
          newRouteLines.push({
            coordinates: [
              { latitude: fromStop.lat, longitude: fromStop.lng },
              { latitude: toStop.lat, longitude: toStop.lng },
            ],
            color,
            mode,
            duration,
            fromStopId: fromStop.id,
            toStopId: toStop.id,
          });
        }
      }
    }

    setRouteLines(newRouteLines);
  };

  // Sort stops by day first, then by order
  const getSortedStops = (stops: Stop[]) => {
    return [...stops].sort((a, b) => {
      // First sort by day
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      // Then by order within the same day
      return a.order - b.order;
    });
  };

  // Group stops by day for better organization
  const getStopsByDay = (stops: Stop[]) => {
    const sortedStops = getSortedStops(stops);
    const groupedStops: { [key: number]: Stop[] } = {};
    
    sortedStops.forEach(stop => {
      if (!groupedStops[stop.day]) {
        groupedStops[stop.day] = [];
      }
      groupedStops[stop.day].push(stop);
    });
    
    return groupedStops;
  };

  const getMarkerColor = (stop: Stop) => {
    const dayColors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
    return dayColors[(stop.day - 1) % dayColors.length];
  };

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

  const handleEditStop = (stop: Stop) => {
    setSelectedStop(stop);
    setShowEditStop(true);
  };

  const handleToggleTransport = async () => {
    const newShowTransport = !showTransport;
    setShowTransport(newShowTransport);
    
    if (newShowTransport && currentTrip) {
      console.log('[MapScreen] Showing transport - generating routes for all stops');
      
      try {
        // Generate transport segments for all consecutive stops
        await regenerateAllTransportSegments(currentTrip.id);
        console.log('[MapScreen] Transport routes generated successfully');
        
        // Regenerate map routes
        setTimeout(() => {
          generateRoutesFromTransportSegments();
        }, 500);
      } catch (error) {
        console.error('[MapScreen] Failed to generate transport routes:', error);
        Alert.alert('Error', 'Failed to generate transport routes. Please try again.');
        setShowTransport(false); // Reset on error
      }
    } else {
      console.log('[MapScreen] Hiding transport');
    }
  };

  const getTransportToNext = (stop: Stop, originalIndex: number) => {
    if (!currentTrip) return null;
    
    const sortedStops = getSortedStops(currentTrip.stops);
    const nextStop = sortedStops[originalIndex + 1];
    
    if (!nextStop) return null;
    
    const transportSegment = getTransportSegment(currentTrip.id, stop.id, nextStop.id);
    
    if (!transportSegment) {
      return {
        mode: 'driving' as TransportMode,
        distance: 0,
        duration: 30,
        toStop: nextStop,
        onModeChange: (mode: TransportMode) => {
          updateTransportMode(currentTrip.id, stop.id, nextStop.id, mode);
        },
      };
    }
    
    return {
      mode: transportSegment.mode,
      distance: transportSegment.distance,
      duration: transportSegment.duration,
      toStop: nextStop,
      onModeChange: (mode: TransportMode) => {
        updateTransportMode(currentTrip.id, stop.id, nextStop.id, mode);
      },
    };
  };

  const fitToStops = () => {
    if (!currentTrip?.stops || currentTrip.stops.length === 0) return;
    
    const coordinates = currentTrip.stops.map(stop => ({
      latitude: stop.lat,
      longitude: stop.lng,
    }));
    
    if (mapRef.current && coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  };

  const toggleTransport = () => {
    handleToggleTransport();
  };

  const handleMenuPress = () => {
    setShowTripSelector(true);
  };

  const handleEditPress = () => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    
    // Auto-expand panel to full when entering edit mode
    if (newEditMode) {
      setPanelPosition('full');
    }
  };

  const handleLocatePress = () => {
    getCurrentLocation();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 32,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10},
      shadowOpacity: theme.mode === 'dark' ? 0.6 : 0.1,
      shadowRadius: 8,
      elevation: 12,
      zIndex: 10,
      marginHorizontal: -16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuButton: {
      marginRight: 12,
      padding: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
      padding: 12,
      borderRadius: 12,
    },
    mapContainer: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    controls: {
      position: 'absolute',
      top: 16,
      right: 16,
      gap: 8,
    },
    controlButton: {
      backgroundColor: theme.colors.card,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    tripInfoContainer: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      marginHorizontal: -16,
      marginBottom: 10,
      backgroundColor: theme.colors.card,
      shadowColor: '#000',
      shadowOffset: { width: Infinity, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.15,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 10,
    },
    tripInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tripName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      backgroundColor: theme.colors.secondary,
      padding: 8,
      borderRadius: 8,
    },
    editButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      padding: 8,
      borderRadius: 8,
    },
    transportButton: {
      backgroundColor: theme.colors.secondary,
      padding: 8,
      borderRadius: 8,
    },
    transportButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    customMarker: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    markerText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    stopsSection: {
      marginTop: 8,
      zIndex: 9,
      elevation: 8,
    },
    daySection: {
      marginBottom: 20,
    },
    dayHeader: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.surface,
      paddingVertical: 8,
      borderRadius: 8,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 32,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.modalBackground,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    tripList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    tripItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
      marginVertical: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tripItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eff6ff',
    },
    tripItemName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    tripDetails: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
  });

  const renderTripSelector = () => (
    <Modal
      visible={showTripSelector}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowTripSelector(false)}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('map.selectTrip')}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tripItem,
                currentTrip?.id === item.id && styles.tripItemSelected
              ]}
              onPress={() => {
                setCurrentTrip(item);
                setShowTripSelector(false);
              }}
            >
              <View>
                <Text style={styles.tripItemName}>{item.name}</Text>
                <Text style={styles.tripDetails}>
                  {item.stops?.length || 0} stops • {item.startDate} - {item.endDate}
                </Text>
              </View>
              {currentTrip?.id === item.id && (
                <Ionicons name="checkmark" size={24} color="#2563eb" />
              )}
            </TouchableOpacity>
          )}
          style={styles.tripList}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderStopsContent = () => {
    if (!currentTrip?.stops || currentTrip.stops.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>{t('tripDetail.noStopsPlanned')}</Text>
          <Text style={styles.emptySubtext}>
            {t('tripDetail.noStopsSubtitle')}
          </Text>
        </View>
      );
    }

    const sortedStops = getSortedStops(currentTrip.stops);
    
    const getScrollPadding = () => {
      switch (panelPosition) {
        case 'full': return 165;
        case 'mid': return 570;
        case 'minimized': return 2000;
        default: return 500;
      }
    };
    
    if (isEditMode) {
      return (
        <ScrollView
          ref={editScrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: getScrollPadding() }}
          overScrollMode="auto"
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={false}
          onScroll={(event) => {
            currentScrollY.current = event.nativeEvent.contentOffset.y;
          }}
        >
          {sortedStops.map((stop, index) => (
            <View key={stop.id}>
              <StopCard
                stop={stop}
                index={index}
                onDelete={() => handleDeleteStop(stop.id)}
                onEdit={() => handleEditStop(stop)}
              />
            </View>
          ))}
        </ScrollView>
      );
    }

    const stopsByDay = getStopsByDay(currentTrip.stops);
    
    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getScrollPadding() }}
        overScrollMode="auto"
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {Object.keys(stopsByDay)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(day => {
            const dayStops = stopsByDay[parseInt(day)];
            return (
              <View key={day} style={styles.daySection}>
                <Text style={styles.dayHeader}>
                  Day {day} ({dayStops.length} {dayStops.length === 1 ? t('tripList.stop') : t('tripList.stops')})
                </Text>
                
                {dayStops
                  .sort((a, b) => a.order - b.order)
                  .map((stop) => {
                    const globalIndex = sortedStops.findIndex(s => s.id === stop.id);
                    const transportToNext = showTransport ? getTransportToNext(stop, globalIndex) : null;
                    
                    return (
                      <View key={stop.id}>
                        <StopCard
                          stop={stop}
                          index={globalIndex}
                          onDelete={() => handleDeleteStop(stop.id)}
                          onEdit={() => handleEditStop(stop)}
                        />
                        {transportToNext && (
                          <TransportCard
                            mode={transportToNext.mode}
                            distance={transportToNext.distance}
                            duration={transportToNext.duration}
                            fromStop={stop.name}
                            toStop={transportToNext.toStop.name}
                            onModeChange={transportToNext.onModeChange}
                            isCrossDay={transportToNext.toStop.day !== stop.day}
                          />
                        )}
                      </View>
                    );
                  })
                }
              </View>
            );
          })
        }
      </ScrollView>
    );
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedTheme.colors.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={[styles.header, { backgroundColor: animatedTheme.colors.background, borderBottomColor: animatedTheme.colors.border }]}>
          <View style={styles.headerLeft}>
            <View ref={menuButtonRef} collapsable={false}>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={handleMenuPress}
              >
                <Ionicons name="menu" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View>
              <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]}>
                {currentTrip?.name || t('map.noTripSelected')}
              </Animated.Text>
              <Animated.Text style={[styles.headerSubtitle, { color: animatedTheme.colors.textSecondary }]}>
                {currentTrip ? `${currentTrip.stops?.length || 0} ${currentTrip.stops?.length === 1 ? t('tripList.stop') : t('tripList.stops')}` : t('map.createATrip')}
              </Animated.Text>
            </View>
          </View>
          
          <View ref={createTripButtonRef} collapsable={false}>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setShowCreateTrip(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={currentLocation || {
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {showRoutes && routeLines.map((route, index) => (
              <Polyline
                key={`route-${index}`}
                coordinates={route.coordinates}
                strokeColor={route.color}
                strokeWidth={4}
              />
            ))}

            {/* Stop markers with numbers - always visible */}
            {currentTrip?.stops && getSortedStops(currentTrip.stops).map((stop, index) => (
              <Marker
                key={stop.id}
                coordinate={{
                  latitude: stop.lat,
                  longitude: stop.lng,
                }}
                title={stop.name}
                tracksViewChanges={false}
              >
                <View style={[
                  styles.customMarker,
                  { backgroundColor: getMarkerColor(stop) }
                ]}>
                  <Text style={styles.markerText}>
                    {index + 1}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>

          <View style={styles.controls}>
            <View ref={locateButtonRef} collapsable={false}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={handleLocatePress}
              >
                <Ionicons name="locate" size={20} color="#2563eb" />
              </TouchableOpacity>
            </View>
            
            {currentTrip?.stops && currentTrip.stops.length > 0 && (
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={fitToStops}
              >
                <Ionicons name="expand" size={20} color="#2563eb" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {currentTrip && (
          <SlidingPanel
            position={panelPosition}
            onPositionChange={setPanelPosition}
            title={t('map.tripItinerary')}
          >
            <View style={styles.tripInfoContainer}>
              <View style={styles.tripInfo}>
                <Text style={styles.tripName}>{currentTrip.name}</Text>
                <View style={styles.actionButtons}>
                  <View ref={transportButtonRef} collapsable={false}>
                    <TouchableOpacity
                      style={[
                        styles.transportButton,
                        showTransport && styles.transportButtonActive
                      ]}
                      onPress={toggleTransport}
                    >
                      <Ionicons
                        name={showTransport ? "car" : "car-outline"}
                        size={20}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                  <View ref={addStopButtonRef} collapsable={false}>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setShowAddStop(true)}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.stopsSection}>
              {renderStopsContent()}
            </View>
          </SlidingPanel>
        )}

        {renderTripSelector()}
        
        <CreateTripModal
          visible={showCreateTrip}
          onClose={() => setShowCreateTrip(false)}
          onTripCreated={(trip) => {
            setCurrentTrip(trip);
            setShowCreateTrip(false);
          }}
        />

        <AddStopModal
          visible={showAddStop}
          onClose={() => setShowAddStop(false)}
          tripId={currentTrip?.id || ''}
          onStopAdded={() => setShowAddStop(false)}
        />

        <AddStopModal
          visible={showEditStop}
          onClose={() => setShowEditStop(false)}
          tripId={currentTrip?.id || ''}
          editStop={selectedStop}
          onStopAdded={() => setShowEditStop(false)}
        />

        {/* Tutorial Overlay */}
        {tutorialActive && <TutorialOverlay currentScreen="map" targetRefs={elementPositions} />}
      </SafeAreaView>
    </Animated.View>
  );
}
