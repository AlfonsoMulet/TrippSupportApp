import React, { useMemo, useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';

type TransportMode = 'driving' | 'walking' | 'bicycling' | 'flight';

interface TransportCardProps {
  mode: TransportMode;
  distance: number; // in meters
  duration: number; // in seconds
  fromStop: string;
  toStop: string;
  onModeChange?: (mode: TransportMode) => void;
  isCrossDay?: boolean; // Indicates if this connects stops on different days
}

const transportModeOptions: { value: TransportMode; label: string; icon: string; color: string }[] = [
  { value: 'driving', label: 'Driving', icon: 'car', color: '#2563eb' },
  { value: 'walking', label: 'Walking', icon: 'walk', color: '#10b981' },
  { value: 'bicycling', label: 'Cycling', icon: 'bicycle', color: '#8b5cf6' },
  { value: 'flight', label: 'Flight', icon: 'airplane', color: '#ef4444' },
];

/**
 * Map generic icon names to Ionicons-safe names if needed.
 * Ionicons v5 accepts names like "car", "bus", "bicycle" etc., but mapping here
 * reduces chance of an unknown icon string being passed.
 */
const resolveIoniconName = (name?: string) => {
  if (!name) return 'car';
  const map: Record<string, string> = {
    car: 'car',
    walk: 'walk',
    bus: 'bus',
    bicycle: 'bicycle',
    airplane: 'airplane',
    train: 'train',
    // fallback
    default: 'car',
  };
  return map[name] ?? map.default;
};

export default memo(function TransportCard({
  mode,
  distance,
  duration,
  fromStop,
  toStop,
  onModeChange = () => {},
  isCrossDay = false,
}: TransportCardProps) {
  const { theme } = useThemeStore();
  const [showModeSelector, setShowModeSelector] = useState(false);

  const currentMode = useMemo(
    () => transportModeOptions.find((o) => o.value === mode),
    [mode]
  );

  const formatDistance = (meters: number): string => {
    if (!isFinite(meters) || meters < 0) return '--';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '--';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const handleModePress = (e?: GestureResponderEvent) => {
    setShowModeSelector(true);
  };

  const styles = StyleSheet.create({
    container: {
      marginLeft: 33,
      marginVertical: 15,
      alignItems: 'center',
      width: '100%',       // takes all available horizontal space
      maxWidth: 600,       // optional: limits how wide it can get
      paddingHorizontal: 16, 
    },
    transportCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme?.colors?.card ?? '#fff',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme?.colors?.border ?? '#e5e7eb',
      minHeight: 100,
      // Add visual feedback for tappability
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    transportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    transportIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    transportInfo: {
      flex: 1,
    },
    transportMode: {
      fontSize: 18,
      fontWeight: '700',
      color: theme?.colors?.text ?? '#000',
      marginBottom: 4,
    },
    transportRoute: {
      fontSize: 13,
      color: theme?.colors?.textSecondary ?? '#6b7280',
    },
    transportMetrics: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metric: {
      flex: 1,
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme?.colors?.text ?? '#000',
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 11,
      color: theme?.colors?.textTertiary ?? '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    metricSeparator: {
      width: 1,
      height: 32,
      backgroundColor: theme?.colors?.border ?? '#e5e7eb',
      marginHorizontal: 8,
    },
    changeButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: theme?.colors?.modalBackground ?? '#fff',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme?.colors?.header ?? '#fff',
      borderBottomWidth: 1,
      borderBottomColor: theme?.colors?.border ?? '#e5e7eb',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme?.colors?.text ?? '#000',
    },
    routeInfo: {
      backgroundColor: theme?.colors?.card ?? '#fff',
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme?.colors?.border ?? '#e5e7eb',
    },
    routeInfoText: {
      fontSize: 16,
      color: theme?.colors?.text ?? '#000',
      marginBottom: 4,
    },
    optionsList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme?.colors?.card ?? '#fff',
      padding: 16,
      borderRadius: 12,
      marginVertical: 4,
      borderWidth: 1,
      borderColor: theme?.colors?.border ?? '#e5e7eb',
    },
    optionSelected: {
      borderColor: theme?.colors?.primary ?? '#3b82f6',
      backgroundColor:
        (theme?.mode === 'dark') ? theme?.colors?.surface ?? '#111827' : '#eff6ff',
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {  
      fontSize: 16,
      fontWeight: '600',
      color: theme?.colors?.text ?? '#000',
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 14,
      color: theme?.colors?.textSecondary ?? '#6b7280',
    },
    optionDuration: {
      fontSize: 14,
      fontWeight: '500',
      color: theme?.colors?.primary ?? '#3b82f6',
    },
  });

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.transportCard}
          onPress={handleModePress}
          accessibilityRole="button"
          accessibilityLabel="Open transport options"
        >
          <View style={styles.transportHeader}>
            <View
              style={[
                styles.transportIcon,
                { backgroundColor: currentMode?.color ?? theme?.colors?.primary },
              ]}
            >
              <Ionicons
                name={resolveIoniconName(currentMode?.icon) as any}
                size={22}
                color="white"
              />
            </View>

            <View style={styles.transportInfo}>
              <Text style={styles.transportMode}>
                {currentMode?.label ?? 'Transport'}
              </Text>
              <Text style={styles.transportRoute}>
                {isCrossDay && 'Multi-day • '}Tap to change transport mode
              </Text>
            </View>

            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setShowModeSelector(true)}
              accessibilityRole="button"
              accessibilityLabel="Change transport mode"
            >
              <Ionicons name="swap-horizontal" size={24} color={theme?.colors?.textSecondary ?? '#6b7280'} />
            </TouchableOpacity>
          </View>

          <View style={styles.transportMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue} numberOfLines={1}>{formatDistance(distance)}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>Distance</Text>
            </View>

            <View style={styles.metricSeparator} />

            <View style={styles.metric}>
              <Text style={styles.metricValue} numberOfLines={1}>{formatDuration(duration)}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>Time</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Transport Mode Selector Modal */}
      <Modal visible={showModeSelector} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModeSelector(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ width: 24, opacity: 0 }}>
              <Ionicons name="close" size={24} color={theme?.colors?.textSecondary ?? '#6b7280'} />
            </View>
            <Text style={styles.modalTitle}>Choose Transport</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoText}>From: {fromStop}</Text>
            <Text style={styles.routeInfoText}>To: {toStop}</Text>
          </View>

          <FlatList
            data={transportModeOptions}
            keyExtractor={(item) => item.value}
            style={styles.optionsList}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, mode === item.value && styles.optionSelected]}
                onPress={() => {
                  onModeChange(item.value);
                  setShowModeSelector(false);
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={resolveIoniconName(item.icon) as any} size={24} color="white" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                  <Text style={styles.optionDescription}>
                    {item.value === 'driving' && 'Car, taxi, or ride-share'}
                    {item.value === 'walking' && 'On foot'}
                    {item.value === 'bicycling' && 'Bicycle or bike-share'}
                    {item.value === 'flight' && 'Airplane (for long distances)'}
                  </Text>
                </View>
                {mode === item.value && <Ionicons name="checkmark-circle" size={24} color={item.color} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if mode, distance, or duration changes
  return (
    prevProps.mode === nextProps.mode &&
    prevProps.distance === nextProps.distance &&
    prevProps.duration === nextProps.duration &&
    prevProps.isCrossDay === nextProps.isCrossDay
  );
});
