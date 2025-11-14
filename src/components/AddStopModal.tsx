import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

import { Ionicons } from '@expo/vector-icons';
import { useTripStore, Stop } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../i18n/useTranslation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 1000;

// Replace with your Google Places API key
const GOOGLE_PLACES_API_KEY = 'AIzaSyDgpPXqecqrcuikozBRy4AYwFGpN1a32w0';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string; 
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
}

interface AddStopModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  onStopAdded: () => void;
  editStop?: Stop | null;
  preselectedDay?: number | null;
}

const getCategoryOptions = (t: (key: any, params?: Record<string, string | number>) => string): { value: Stop['category']; label: string; icon: string }[] => [
  { value: 'food', label: t('addStop.categoryFood'), icon: 'restaurant' },
  { value: 'activity', label: t('addStop.categoryActivity'), icon: 'play' },
  { value: 'hotel', label: t('addStop.categoryHotel'), icon: 'bed' },
  { value: 'sightseeing', label: t('addStop.categorySightseeing'), icon: 'camera' },
  { value: 'transport', label: t('addStop.categoryTransport'), icon: 'car' },
  { value: 'other', label: t('addStop.categoryOther'), icon: 'ellipse' },
];

// Currency detection based on location
const getCurrency = () => {
  return 'CHF';
};

export default function AddStopModal({
  visible,
  onClose,
  tripId,
  onStopAdded,
  editStop,
  preselectedDay
}: AddStopModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<Stop['category']>('other');
  const [day, setDay] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0); // in minutes
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [cost, setCost] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Error states for validation
  const [dayError, setDayError] = useState(false);

  // Optional advanced fields
  const [tags, setTags] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [companions, setCompanions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { addStop, updateStop, loading, currentTrip } = useTripStore();
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation refs
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const isEditing = !!editStop;
  const currency = getCurrency();
  const categoryOptions = getCategoryOptions(t);

  // Animate modal in/out
  useEffect(() => {
    if (visible) {
      // Slide in with ease-out
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset for next open
      translateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      dragY.setValue(0);
    }
  }, [visible]);

  // Close modal with animation
  const closeModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Handle pan gesture
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragY } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        // Only allow dragging down
        if (event.nativeEvent.translationY < 0) {
          dragY.setValue(0);
        }
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // Dismiss if dragged down enough or fast enough
      if (translationY > DISMISS_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
        closeModal();
      } else {
        // Snap back
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }
    }
  };

  useEffect(() => {
    if (visible) {
      if (editStop) {
        setSearchQuery(editStop.name || '');
        setSelectedPlace({
          place_id: editStop.id,
          name: editStop.name,
          formatted_address: editStop.address || '',
          geometry: {
            location: {
              lat: editStop.lat,
              lng: editStop.lng,
            }
          },
          types: [],
        });
        setNotes(editStop.notes || '');
        setCategory(editStop.category || 'other');
        setDay(editStop.day ? editStop.day.toString() : '');
        setEstimatedTime(editStop.estimatedTime || 0);
        setCost(editStop.cost && editStop.cost > 0 ? editStop.cost.toString() : '');
        setTags((editStop as any).tags || '');
        setWebsite((editStop as any).website || '');
        setPhone((editStop as any).phone || '');
        setCompanions((editStop as any).companions || '');
        setSearchResults([]);
      } else {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedPlace(null);
        setNotes('');
        setCategory('other');
        setDay(preselectedDay ? preselectedDay.toString() : '');
        setEstimatedTime(0);
        setCost('');
        setTags('');
        setWebsite('');
        setPhone('');
        setCompanions('');
        setShowAdvanced(false);
      }
    }
  }, [visible, editStop, preselectedDay]);

  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const autocompleteResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      if (!autocompleteResponse.ok) {
        throw new Error('Failed to search places');
      }
      
      const autocompleteData = await autocompleteResponse.json();
      
      if (autocompleteData.status === 'OK' && autocompleteData.predictions) {
        const placePromises = autocompleteData.predictions.slice(0, 25).map(async (prediction: any) => {
          try {
            const detailsResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=place_id,name,formatted_address,geometry,types,rating,photos&key=${GOOGLE_PLACES_API_KEY}`
            );
            const detailsData = await detailsResponse.json();
            
            if (detailsData.status === 'OK') {
              return detailsData.result;
            }
            return null;
          } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
          }
        });

        const places = (await Promise.all(placePromises)).filter(p => p !== null) as PlaceResult[];
        setSearchResults(places);
      } else if (autocompleteData.status === 'REQUEST_DENIED') {
        Alert.alert('Error', 'Google Places API key is not valid. Please check your configuration.');
        setSearchResults(getMockResults(query));
      } else {
        await fallbackTextSearch(query);
      }
    } catch (error) {
      console.error('Places search error:', error);
      setSearchResults(getMockResults(query));
    } finally {
      setIsSearching(false);
    }
  };

  const fallbackTextSearch = async (query: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        setSearchResults(data.results.slice(0, 25));
      } else {
        setSearchResults(getMockResults(query));
      }
    } catch (error) {
      console.error('Fallback search error:', error);
      setSearchResults(getMockResults(query));
    }
  };

  const getMockResults = (query: string): PlaceResult[] => {
    const mockPlaces: PlaceResult[] = [
      {
        place_id: '1',
        name: 'Eiffel Tower',
        formatted_address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
        geometry: { location: { lat: 48.8584, lng: 2.2945 } },
        types: ['tourist_attraction'],
        rating: 4.6,
      },
      {
        place_id: '2',
        name: 'Louvre Museum',
        formatted_address: 'Rue de Rivoli, 75001 Paris, France',
        geometry: { location: { lat: 48.8606, lng: 2.3376 } },
        types: ['museum'],
        rating: 4.7,
      },
    ];

    return mockPlaces.filter(place => 
      place.name.toLowerCase().includes(query.toLowerCase()) ||
      place.formatted_address.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (isEditing) return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSearchResults([]);
    
    if (place.types.includes('restaurant') || place.types.includes('food') || place.types.includes('cafe')) {
      setCategory('food');
    } else if (place.types.includes('lodging') || place.types.includes('hotel')) {
      setCategory('hotel');
    } else if (place.types.includes('tourist_attraction') || place.types.includes('museum') || 
               place.types.includes('art_gallery') || place.types.includes('landmark')) {
      setCategory('sightseeing');
    } else if (place.types.includes('park') || place.types.includes('amusement_park') || 
               place.types.includes('zoo') || place.types.includes('aquarium')) {
      setCategory('activity');
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '00h 00min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}min`;
  };

  const handleSubmit = async () => {
    if (!selectedPlace) {
      Alert.alert(t('common.error'), t('addStop.selectPlaceError'));
      return;
    }

    if (!tripId) {
      Alert.alert(t('common.error'), t('addStop.noTripError'));
      return;
    }

    setDayError(false);

    if (!day.trim()) {
      setDayError(true);
      return;
    }

    try {
      const dayValue = parseInt(day.trim());
      const timeValue = estimatedTime > 0 ? estimatedTime : undefined;
      const costValue = cost.trim() ? parseFloat(cost.trim()) : undefined;
      
      if (isNaN(dayValue) || dayValue < 1) {
        setDayError(true);
        return;
      }

      if (cost.trim() && (isNaN(costValue!) || costValue! < 0)) {
        return;
      }
      
      if (!selectedPlace.geometry?.location?.lat || !selectedPlace.geometry?.location?.lng) {
        Alert.alert(t('common.error'), t('addStop.invalidLocation'));
        return;
      }
      
      if (!selectedPlace.name || selectedPlace.name.trim().length === 0) {
        Alert.alert(t('common.error'), t('addStop.placeNameRequired'));
        return;
      }

      if (isEditing && editStop) {
        const updates = {
          name: selectedPlace.name.trim(),
          lat: Number(selectedPlace.geometry.location.lat),
          lng: Number(selectedPlace.geometry.location.lng),
          address: selectedPlace.formatted_address?.trim() || '',
          day: dayValue,
          notes: notes.trim(),
          category: category,
          estimatedTime: timeValue && timeValue > 0 ? timeValue : undefined,
          cost: costValue && costValue > 0 ? costValue : undefined,
          tags: tags.trim() || undefined,
          website: website.trim() || undefined,
          phone: phone.trim() || undefined,
          companions: companions.trim() || undefined,
        };

        await updateStop(editStop.id, updates as any);
      } else {
        const nextOrder = currentTrip?.stops?.length || 0;
        
        const stopData = {
          name: selectedPlace.name.trim(),
          lat: Number(selectedPlace.geometry.location.lat),
          lng: Number(selectedPlace.geometry.location.lng),
          address: selectedPlace.formatted_address?.trim() || '',
          order: Math.max(0, nextOrder),
          day: dayValue,
          notes: notes.trim(),
          category: category,
          estimatedTime: timeValue && timeValue > 0 ? timeValue : undefined,
          cost: costValue && costValue > 0 ? costValue : undefined,
          tags: tags.trim() || undefined,
          website: website.trim() || undefined,
          phone: phone.trim() || undefined,
          companions: companions.trim() || undefined,
        };

        await addStop(tripId, stopData as any);
      }

      onStopAdded();
      
    } catch (error: any) {
      console.error('Error saving stop:', error);
      Alert.alert(t('common.error'), error.message || t(isEditing ? 'addStop.failedToUpdate' : 'addStop.failedToAdd'));
    }
  };

  const renderSearchResult = ({ item }: { item: PlaceResult }) => (
    <TouchableOpacity
      style={styles.searchResult}
      onPress={() => handlePlaceSelect(item)}
    >
      <View style={styles.placeIcon}>
        <Ionicons name="location" size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.placeAddress} numberOfLines={2}>
          {item.formatted_address}
        </Text>
        <View style={styles.placeMetaRow}>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={theme.colors.warning} />
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
          )}
          {item.types && item.types.length > 0 && (
            <Text style={styles.placeType}>
              {item.types[0].replace(/_/g, ' ')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: typeof categoryOptions[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryOption,
        category === item.value && styles.categoryOptionSelected
      ]}
      onPress={() => setCategory(item.value)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={20} 
        color={category === item.value ? 'white' : theme.colors.textSecondary} 
      />
      <Text style={[
        styles.categoryText,
        category === item.value && styles.categoryTextSelected
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
    },
    panel: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: SCREEN_HEIGHT * 0.9,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      overflow: 'hidden',
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 12,
      paddingBottom: 16,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: 'transparent',
    },
    dragIndicator: {
      width: 36,
      height: 5,
      backgroundColor: theme.colors.textTertiary,
      borderRadius: 3,
      marginBottom: 8,
      opacity: 0.5,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
    },
    searchResults: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginTop: 8,
      maxHeight: 350,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchResult: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    placeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    placeInfo: {
      flex: 1,
    },
    placeName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 4,
    },
    placeAddress: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    placeMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rating: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    placeType: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      textTransform: 'capitalize',
    },
    form: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    selectedPlaceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    selectedPlace: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedPlaceName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    selectedPlaceAddress: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    categoryList: {
      marginBottom: 24,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 24,
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
    categoryTextSelected: {
      color: 'white',
    },
    detailsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    detailInput: {
      flex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8,
    },
    optionalLabel: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.text,
    },
    inputError: {
      borderColor: '#EF4444',
      borderWidth: 2,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      marginTop: 4,
    },
    timePicker: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    timePickerText: {
      fontSize: 14,
      color: estimatedTime > 0 ? theme.colors.text : theme.colors.textTertiary,
    },
    notesInput: {
      height: 80,
      marginBottom: 16,
    },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginBottom: 16,
    },
    advancedToggleText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
      marginLeft: 8,
    },
    submitButton: {
      backgroundColor: '#3b82f6',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.textTertiary,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 16,
      gap: 8,
    },
    deleteButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    inlineTimePickerContainer: {
      position: 'absolute',
      top: 45,
      left: 0,
      right: 0,
      zIndex: 1000,
      alignItems: 'center',
    },
    inlineTimePicker: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 280,
      position: 'relative',
    },
    timePickerHeader: {
      marginBottom: 16,
      alignItems: 'center',
    },
    timePickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    nativePickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    pickerColumn: {
      alignItems: 'center',
      flex: 1,
    },
    picker: {
      width: 100,
      height: 150,
    },
    pickerItem: {
      height: 150,
      fontSize: 20,
      color: theme.colors.text,
    },
    pickerSeparator: {
      fontSize: 32,
      fontWeight: '600',
      color: theme.colors.text,
      marginHorizontal: 8,
      marginBottom: 30,
    },
    pickerLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: -20,
      fontWeight: '500',
    },
    timePickerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    timePickerButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    timePickerCancelButton: {
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.secondary,
    },
    timePickerConfirmButton: {
      backgroundColor: theme.colors.primary,
    },
    timePickerCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    timePickerConfirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: 'white',
    },
  });

  const panelTranslateY = Animated.add(translateY, dragY);
  const clampedDragY = dragY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [0, SCREEN_HEIGHT],
    extrapolate: 'clamp',
  });
  const dynamicOverlayOpacity = Animated.multiply(
    overlayOpacity,
    clampedDragY.interpolate({
      inputRange: [0, DISMISS_THRESHOLD],
      outputRange: [1, 0.3],
      extrapolate: 'clamp',
    })
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Dimmed overlay */}
        <TouchableWithoutFeedback onPress={closeModal}>
          <Animated.View
            style={[
              styles.overlay,
              { opacity: dynamicOverlayOpacity },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Panel with PanGestureHandler */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.panel,
              {
                transform: [{ translateY: panelTranslateY }],
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.dragIndicator} />
              <Text style={styles.headerTitle}>
                {t(isEditing ? 'addStop.editTitle' : 'addStop.addTitle')}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!isEditing && (
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('addStop.searchPlaceholder')}
                      placeholderTextColor={theme.colors.textTertiary}
                      value={searchQuery}
                      onChangeText={handleSearch}
                    />
                    {isSearching && (
                      <Ionicons name="reload" size={20} color={theme.colors.textSecondary} />
                    )}
                  </View>

                  {searchResults.length > 0 && (
                    <FlatList
                      data={searchResults}
                      renderItem={renderSearchResult}
                      keyExtractor={(item) => item.place_id}
                      style={styles.searchResults}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                    />
                  )}
                </View>
              )}

              {(selectedPlace || isEditing) && (
                <View style={styles.form}>
                  <Text style={styles.selectedPlaceTitle}>
                    {t(isEditing ? 'addStop.stopDetails' : 'addStop.selectedPlace')}
                  </Text>
                  <View style={styles.selectedPlace}>
                    <Text style={styles.selectedPlaceName}>
                      {selectedPlace?.name || editStop?.name}
                    </Text>
                    <Text style={styles.selectedPlaceAddress} numberOfLines={2}>
                      {selectedPlace?.formatted_address || editStop?.address}
                    </Text>
                    {selectedPlace?.rating && (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color={theme.colors.warning} />
                        <Text style={styles.rating}>{selectedPlace.rating}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.sectionTitle}>{t('addStop.category')}</Text>
                  <View style={{ marginHorizontal: -16 }}>
                    <FlatList
                      data={categoryOptions}
                      renderItem={renderCategory}
                      keyExtractor={(item) => item.value}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryList}
                      contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                  </View>

                  <Text style={styles.sectionTitle}>{t('addStop.details')}</Text>
                  <View style={styles.detailsRow}>
                    <View style={styles.detailInput}>
                      <Text style={styles.label}>{t('addStop.day')} {t('createTrip.required')}</Text>
                      <TextInput
                        style={[styles.input, dayError && styles.inputError]}
                        value={day}
                        onChangeText={(text) => {
                          setDay(text);
                          setDayError(false);
                        }}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                      {dayError && <Text style={styles.errorText}>{t('addStop.dayRequired')}</Text>}
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.label}>{t('addStop.time')}</Text>
                      <View>
                        <TouchableOpacity 
                          style={styles.timePicker}
                          onPress={() => {
                            if (estimatedTime > 0) {
                              const hours = Math.floor(estimatedTime / 60);
                              const mins = estimatedTime % 60;
                              const date = new Date();
                              date.setHours(hours, mins, 0, 0);
                              setPickerDate(date);
                            } else {
                              const date = new Date();
                              date.setHours(0, 0, 0, 0);
                              setPickerDate(date);
                            }
                            setTimePickerVisible(true);
                          }}
                        >
                          <Text style={styles.timePickerText}>
                            {formatTime(estimatedTime)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.label}>{t('addStop.cost')} ({currency})</Text>
                      <TextInput
                        style={styles.input}
                        value={cost}
                        onChangeText={setCost}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>{t('addStop.notes')} <Text style={styles.optionalLabel}>{t('addStop.optional')}</Text></Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t('addStop.notesPlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity 
                    style={styles.advancedToggle}
                    onPress={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Ionicons 
                      name={showAdvanced ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.advancedToggleText}>
                      {t(showAdvanced ? 'addStop.hideMore' : 'addStop.showMore')}
                    </Text>
                  </TouchableOpacity>

                  {showAdvanced && (
                    <>
                      <Text style={styles.label}>{t('addStop.tags')} <Text style={styles.optionalLabel}>{t('addStop.tagsHint')}</Text></Text>
                      <TextInput
                        style={styles.input}
                        value={tags}
                        onChangeText={setTags}
                        placeholder={t('addStop.tagsPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                      />

                      <Text style={[styles.label, { marginTop: 16 }]}>{t('addStop.website')} <Text style={styles.optionalLabel}>{t('addStop.optional')}</Text></Text>
                      <TextInput
                        style={styles.input}
                        value={website}
                        onChangeText={setWebsite}
                        placeholder={t('addStop.websitePlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="url"
                        autoCapitalize="none"
                      />

                      <View style={[styles.detailsRow, { marginTop: 16 }]}>
                        <View style={styles.detailInput}>
                          <Text style={styles.label}>{t('addStop.phone')} <Text style={styles.optionalLabel}>{t('addStop.optional')}</Text></Text>
                          <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder={t('addStop.phonePlaceholder')}
                            placeholderTextColor={theme.colors.textTertiary}
                            keyboardType="phone-pad"
                          />
                        </View>
                        <View style={styles.detailInput}>
                          <Text style={styles.label}>{t('addStop.companions')} <Text style={styles.optionalLabel}>{t('addStop.optional')}</Text></Text>
                          <TextInput
                            style={styles.input}
                            value={companions}
                            onChangeText={setCompanions}
                            placeholder={t('addStop.companionsPlaceholder')}
                            placeholderTextColor={theme.colors.textTertiary}
                          />
                        </View>
                      </View>
                    </>
                  )}

                  <TouchableOpacity 
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    <Text style={styles.submitButtonText}>
                      {loading 
                        ? t(isEditing ? 'addStop.updating' : 'addStop.adding')
                        : t(isEditing ? 'addStop.updateButton' : 'addStop.addButton')
                      }
                    </Text>
                  </TouchableOpacity>

                  {isEditing && editStop && (
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert(
                          t('tripDetail.deleteStop'),
                          t('tripDetail.deleteStopConfirm'),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            { 
                              text: t('common.delete'), 
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const { deleteStop } = useTripStore.getState();
                                  await deleteStop(editStop.id);
                                  onStopAdded();
                                } catch (error) {
                                  Alert.alert(t('common.error'), 'Failed to delete stop');
                                }
                              }
                            },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash" size={20} color="white" />
                      <Text style={styles.deleteButtonText}>{t('tripDetail.deleteStop')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              date={pickerDate}
              onConfirm={(date) => {
                setTimePickerVisible(false);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                setEstimatedTime((hours * 60) + minutes);
              }}
              onCancel={() => setTimePickerVisible(false)}
              is24Hour={true}
              display="spinner"
              textColor={theme.colors.text}
              pickerContainerStyleIOS={{
                backgroundColor: theme.colors.card,
              }}
              customCancelButtonIOS={() => null}
              customConfirmButtonIOS={({ onPress }) => (
                <TouchableOpacity
                  onPress={onPress}
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    marginHorizontal: 10,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                    {t('common.confirm') || 'Confirm'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}
