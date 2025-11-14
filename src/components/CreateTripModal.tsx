import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { useTripStore, Trip } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../i18n/useTranslation';
import { decodeTripData, isValidShareCode } from '../utils/tripEncoding';
import { useIsDeveloper } from '../utils/developerAccess';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 1000;

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
  onTripCreated: (trip: Trip) => void;
  editTrip?: Trip | null;
  isTutorial?: boolean; // Auto-fill for tutorial
}

export default function CreateTripModal({ 
  visible, 
  onClose, 
  onTripCreated, 
  editTrip,
  isTutorial = false,
}: CreateTripModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [editingDate, setEditingDate] = useState<'start' | 'end' | null>(null);
  const [showImportSection, setShowImportSection] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importedTripData, setImportedTripData] = useState<Partial<Trip> | null>(null);

  const { createTrip, updateTrip, addStop, loading } = useTripStore();
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const isDeveloper = useIsDeveloper();

  // Animation refs
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const isEditing = !!editTrip;

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

  // Update marked dates when start/end dates change
  useEffect(() => {
    if (startDate && endDate) {
      const marked: any = {};
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Uniform color scheme
      const rangeColor = theme.colors.primary;
      const lightOpacity = theme.mode === 'dark' ? 0.35 : 0.25;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = format(d, 'yyyy-MM-dd');
        const isStart = dateString === startDate;
        const isEnd = dateString === endDate;
        const isEditing = (editingDate === 'start' && isStart) || (editingDate === 'end' && isEnd);

        marked[dateString] = {
          customStyles: {
            container: {
              backgroundColor: isStart || isEnd ? rangeColor : `rgba(${parseInt(rangeColor.slice(1,3), 16)}, ${parseInt(rangeColor.slice(3,5), 16)}, ${parseInt(rangeColor.slice(5,7), 16)}, ${lightOpacity})`,
              width: 38,
              height: 38,
              borderRadius: isStart && isEnd ? 50 : isStart ? 50 : isEnd ? 50 : 4,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: isEditing ? 2 : 0,
              borderColor: isEditing ? 'white' : 'transparent',
            },
            text: {
              color: 'white',
              fontWeight: isStart || isEnd ? '700' : '600',
              fontSize: 16,
            }
          }
        };
      }
      setMarkedDates(marked);
    } else if (startDate) {
      setMarkedDates({
        [startDate]: {
          customStyles: {
            container: {
              backgroundColor: theme.colors.primary,
              width: 38,
              height: 38,
              borderRadius: 50,
              justifyContent: 'center',
              alignItems: 'center',
            },
            text: {
              color: 'white',
              fontWeight: '700',
              fontSize: 16,
            }
          }
        }
      });
    } else {
      setMarkedDates({});
    }
  }, [startDate, endDate, theme.colors.primary, theme.mode, editingDate]);

  useEffect(() => {
    if (visible) {
      if (editTrip) {
        setName(editTrip.name || '');
        setDescription(editTrip.description || '');
        setStartDate(editTrip.startDate || '');
        setEndDate(editTrip.endDate || '');
        setBudget(editTrip.budget ? editTrip.budget.toString() : '');
      } else if (isTutorial) {
        // Auto-fill for tutorial
        setName('Tutorial Trip');
        setDescription('Learning how to use the app!');
        
        // Set dates: tomorrow and day after
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        
        setStartDate(format(tomorrow, 'yyyy-MM-dd'));
        setEndDate(format(dayAfter, 'yyyy-MM-dd'));
        setBudget('500');
      } else {
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setBudget('');
        setMarkedDates({});
        setEditingDate(null);
        setShowImportSection(false);
        setImportCode('');
        setImportedTripData(null);
      }
    }
  }, [visible, editTrip, isTutorial]);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('createTrip.nameRequired'));
      return false;
    }
    
    if (!startDate) {
      Alert.alert(t('common.error'), t('createTrip.startDateRequired'));
      return false;
    }
    
    if (!endDate) {
      Alert.alert(t('common.error'), t('createTrip.endDateRequired'));
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      Alert.alert(t('common.error'), t('createTrip.endDateAfterStart'));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const tripData = {
        name: name.trim(),
        description: description.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        budget: budget.trim() ? parseFloat(budget.trim()) || 0 : 0,
        stops: editTrip?.stops || [],
        transportSegments: editTrip?.transportSegments || [],
        ownerId: editTrip?.ownerId || '',
        sharedWith: editTrip?.sharedWith || [],
        isCollaborative: editTrip?.isCollaborative || false,
        members: editTrip?.members || [],
      };

      if (isEditing && editTrip) {
        await updateTrip(editTrip.id, tripData);
        const updatedTrip: Trip = {
          ...editTrip,
          ...tripData,
          updatedAt: new Date().toISOString(),
        };
        onTripCreated(updatedTrip);
      } else {
        const tripId = await createTrip(tripData);

        // If we have imported trip data with stops, create them
        if (importedTripData?.stops && importedTripData.stops.length > 0) {
          console.log(`Creating ${importedTripData.stops.length} stops for imported trip...`);

          for (const stop of importedTripData.stops) {
            try {
              // Remove the id field since we're creating new stops
              const { id, ...stopDataWithoutId } = stop as any;
              await addStop(tripId, stopDataWithoutId);
            } catch (stopError) {
              console.error('Failed to create stop:', stop.name, stopError);
              // Continue creating other stops even if one fails
            }
          }
        }

        const newTrip: Trip = {
          ...tripData,
          id: tripId,
          userId: '',
          ownerId: '',
          sharedWith: [],
          isCollaborative: false,
          members: [],
          stops: importedTripData?.stops || [],
          transportSegments: importedTripData?.transportSegments || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onTripCreated(newTrip);
      }

      onClose();

    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || t(isEditing ? 'createTrip.failedToUpdate' : 'createTrip.failedToCreate')
      );
    }
  };

  const handleDayPress = (day: DateData) => {
    // Case 1: Range is complete and user wants to edit a date
    if (startDate && endDate && !editingDate) {
      if (day.dateString === startDate) {
        // User tapped start date - prepare to edit it
        setEditingDate('start');
        return;
      } else if (day.dateString === endDate) {
        // User tapped end date - prepare to edit it
        setEditingDate('end');
        return;
      } else {
        // User tapped a different date - start fresh
        setStartDate(day.dateString);
        setEndDate('');
        setEditingDate(null);
        return;
      }
    }

    // Case 2: Currently editing start date
    if (editingDate === 'start') {
      if (endDate && day.dateString > endDate) {
        // New start is after end, swap them
        setStartDate(endDate);
        setEndDate(day.dateString);
      } else {
        setStartDate(day.dateString);
      }
      setEditingDate(null);
      return;
    }

    // Case 3: Currently editing end date
    if (editingDate === 'end') {
      if (day.dateString < startDate) {
        // New end is before start, swap them
        setEndDate(startDate);
        setStartDate(day.dateString);
      } else {
        setEndDate(day.dateString);
      }
      setEditingDate(null);
      return;
    }

    // Case 4: No start date yet
    if (!startDate) {
      setStartDate(day.dateString);
      setEndDate('');
      setEditingDate(null);
      return;
    }

    // Case 5: Start date exists but no end date
    if (startDate && !endDate) {
      if (day.dateString < startDate) {
        // Just move the start date to the new date
        setStartDate(day.dateString);
      } else {
        setEndDate(day.dateString);
      }
      setEditingDate(null);
    }
  };

  const getTripDuration = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights;
    }
    return 0;
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setImportCode(text);
      }
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to paste from clipboard');
    }
  };

  const handleImportCode = () => {
    const code = importCode.trim();
    if (!isValidShareCode(code)) {
      Alert.alert(t('common.error'), t('createTrip.invalidShareCode'));
      return;
    }

    const tripData = decodeTripData(code);
    if (!tripData) {
      Alert.alert(t('common.error'), t('createTrip.invalidShareCode'));
      return;
    }

    // Store the full imported trip data (including stops and segments)
    setImportedTripData(tripData);

    // Fill the form with the imported data
    setName(tripData.name || '');
    setDescription(tripData.description || '');
    setStartDate(tripData.startDate || '');
    setEndDate(tripData.endDate || '');
    setBudget(tripData.budget ? tripData.budget.toString() : '');

    // Close the import section and clear the code
    setShowImportSection(false);
    setImportCode('');

    const stopsCount = tripData.stops?.length || 0;
    Alert.alert(
      t('common.success'),
      `${t('createTrip.tripImported')} ${stopsCount} stops will be created.`
    );
  };

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
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    placeholder: {
      color: theme.colors.textSecondary,
    },
    form: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
    },
    textArea: {
      height: 100,
      paddingTop: 12,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateInput: {
      flex: 1,
    },
    dateButton: {
      justifyContent: 'center',
      padding: 12,
    },
    dateButtonText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    helpText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 6,
      fontStyle: 'italic',
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.textTertiary,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    additionalActions: {
      marginTop: 30,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    dangerButton: {
      backgroundColor: theme.colors.error,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    dangerButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    formInfo: {
      marginTop: 30,
      padding: 16,
      backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eff6ff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? theme.colors.border : '#bfdbfe',
    },
    infoText: {
      fontSize: 14,
      color: theme.mode === 'dark' ? theme.colors.textSecondary : '#1e40af',
      textAlign: 'center',
      lineHeight: 20,
    },
    calendarContainer: {
      marginBottom: 20,
    },
    calendarCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    durationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.mode === 'dark' ? theme.colors.primary + '20' : theme.colors.primary + '15',
      borderRadius: 10,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    durationText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primary,
      letterSpacing: 0.3,
    },
    importSection: {
      marginBottom: 20,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    importHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    importTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    importCodeInput: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 12,
      color: theme.colors.text,
      fontFamily: 'monospace',
      minHeight: 80,
      marginBottom: 12,
    },
    importActions: {
      flexDirection: 'row',
      gap: 8,
    },
    importButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    importButtonSecondary: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    importButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    importButtonTextSecondary: {
      color: theme.colors.text,
    },
    toggleImportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 20,
      gap: 8,
    },
    toggleImportButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });

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
                {t(isEditing ? 'createTrip.editTitle' : 'createTrip.createTitle')}
              </Text>
            </View>

            <ScrollView
              style={styles.form}
              showsVerticalScrollIndicator={false}
            >
              {/* Import from Code Section */}
              {!isEditing && isDeveloper && (
                <>
                  <TouchableOpacity
                    style={styles.toggleImportButton}
                    onPress={() => setShowImportSection(!showImportSection)}
                  >
                    <Ionicons
                      name={showImportSection ? 'chevron-up' : 'download-outline'}
                      size={20}
                      color={theme.colors.text}
                    />
                    <Text style={styles.toggleImportButtonText}>
                      {showImportSection ? t('createTrip.hideImport') : t('createTrip.importFromCode')}
                    </Text>
                  </TouchableOpacity>

                  {showImportSection && (
                    <View style={styles.importSection}>
                      <View style={styles.importHeader}>
                        <Text style={styles.importTitle}>{t('createTrip.pasteShareCode')}</Text>
                      </View>
                      <TextInput
                        style={styles.importCodeInput}
                        placeholder={t('createTrip.shareCodePlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={importCode}
                        onChangeText={setImportCode}
                        multiline
                        textAlignVertical="top"
                      />
                      <View style={styles.importActions}>
                        <TouchableOpacity
                          style={[styles.importButton, styles.importButtonSecondary]}
                          onPress={handlePasteFromClipboard}
                        >
                          <Ionicons name="clipboard-outline" size={16} color={theme.colors.text} />
                          <Text style={[styles.importButtonText, styles.importButtonTextSecondary]}>
                            {t('createTrip.pasteButton')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.importButton}
                          onPress={handleImportCode}
                          disabled={!importCode.trim()}
                        >
                          <Ionicons name="checkmark" size={16} color="white" />
                          <Text style={styles.importButtonText}>{t('createTrip.importButton')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {showImportSection && (
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>{t('common.or')}</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}
                </>
              )}

              {/* Trip Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('createTrip.tripName')} {t('createTrip.required')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('createTrip.tripNamePlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('createTrip.description')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('createTrip.descriptionPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>

              {/* Calendar Date Range Picker */}
              <View style={styles.calendarContainer}>
                <Text style={styles.label}>
                  {t('createTrip.selectDates')} {t('createTrip.required')}
                </Text>
                <View style={styles.calendarCard}>
                  <Calendar
                    markingType={'custom'}
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    enableSwipeMonths={true}
                    minDate={format(new Date(), 'yyyy-MM-dd')}
                    theme={{
                      calendarBackground: theme.colors.card,
                      textSectionTitleColor: theme.colors.textSecondary,
                      selectedDayBackgroundColor: theme.colors.primary,
                      selectedDayTextColor: 'white',
                      todayTextColor: theme.colors.primary,
                      dayTextColor: theme.colors.text,
                      textDisabledColor: theme.colors.textTertiary + '60',
                      monthTextColor: theme.colors.text,
                      arrowColor: theme.colors.primary,
                      textMonthFontWeight: '700' as any,
                      textDayHeaderFontWeight: '600' as any,
                      textDayFontSize: 16,
                      textMonthFontSize: 18,
                      textDayHeaderFontSize: 14,
                    }}
                  />
                  {editingDate && (
                    <View style={[styles.durationInfo, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }]}>
                      <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                      <Text style={[styles.durationText, { fontSize: 14, fontWeight: '600' }]}>
                        {editingDate === 'start' ? 'Tap to change start date' : 'Tap to change end date'}
                      </Text>
                    </View>
                  )}
                  {!editingDate && startDate && endDate && (
                    <View style={styles.durationInfo}>
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                      <Text style={styles.durationText}>
                        {getTripDuration()} {getTripDuration() === 1 ? 'night' : 'nights'}
                      </Text>
                      <View style={{ width: 1, height: 16, backgroundColor: theme.colors.primary + '40', marginHorizontal: 4 }} />
                      <Text style={[styles.durationText, { fontWeight: '600' }]}>
                        {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  )}
                  {!editingDate && startDate && !endDate && (
                    <View style={[styles.durationInfo, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
                      <Text style={[styles.durationText, { fontSize: 14, fontWeight: '600' }]}>
                        Now select your end date
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Budget */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('createTrip.budget')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('createTrip.budgetPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Text style={styles.helpText}>
                  {t('createTrip.budgetHelp')}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading 
                    ? t(isEditing ? 'createTrip.updating' : 'createTrip.creating')
                    : t(isEditing ? 'createTrip.updateButton' : 'createTrip.createButton')
                  }
                </Text>
              </TouchableOpacity>

              {/* Additional Actions for Editing */}
              {isEditing && editTrip && (
                <View style={styles.additionalActions}>
                  <TouchableOpacity 
                    style={styles.dangerButton}
                    onPress={() => {
                      Alert.alert(
                        t('createTrip.deleteTrip'),
                        t('createTrip.deleteTripConfirm'),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { 
                            text: t('common.delete'), 
                            style: 'destructive',
                            onPress: () => {
                              // TODO: Implement trip deletion
                              Alert.alert(t('common.comingSoon'), 'Trip deletion will be implemented soon');
                            }
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.dangerButtonText}>{t('createTrip.deleteTrip')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Form Info */}
              <View style={styles.formInfo}>
                <Text style={styles.infoText}>
                  {t(isEditing ? 'createTrip.editInfo' : 'createTrip.createInfo')}
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}
