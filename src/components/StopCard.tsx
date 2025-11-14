import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';

interface StopCardProps {
  stop: Stop;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant',
  activity: 'play',
  hotel: 'bed',
  sightseeing: 'camera',
  transport: 'car',
  other: 'ellipse',
};

const categoryColors: Record<string, string> = {
  food: '#f59e0b',
  activity: '#10b981',
  hotel: '#8b5cf6',
  sightseeing: '#ef4444',
  transport: '#3b82f6',
  other: '#6b7280',
};

function StopCard({
  stop,
  index,
  onDelete,
  onEdit,
}: StopCardProps) {
  const { theme } = useThemeStore();

  const categoryIcon = categoryIcons[stop.category] || 'ellipse';
  const categoryColor = categoryColors[stop.category] || '#6b7280';

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    stopCardContainer: {
      flexDirection: 'row',
      width: '100%',
      maxWidth: 400,
    },
    orderContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    orderText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
    contentContainer: {
      flex: 1,
    },
    content: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    categoryIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 4,
    },
    address: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    notes: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    category: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    separator: {
      fontSize: 12,
      color: theme.colors.border,
    },
    day: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    duration: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    cost: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.success,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.stopCardContainer}>
        <View style={styles.orderContainer}>
          <Text style={styles.orderText}>{index + 1}</Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
                  <Ionicons name={categoryIcon} size={16} color="white" />
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {stop.name}
                </Text>
              </View>


              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onEdit}
                >
                  <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onDelete}
                >
                  <Ionicons name="trash" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {stop.address && (
              <Text style={styles.address} numberOfLines={1}>
                {stop.address}
              </Text>
            )}

            {stop.notes && (
              <Text style={styles.notes} numberOfLines={2}>
                {stop.notes}
              </Text>
            )}

            <View style={styles.footer}>
              <View style={styles.metaInfo}>
                <Text style={styles.category}>
                  {stop.category}
                </Text>
                <Text style={styles.separator}> • </Text>
                <Text style={styles.day}>Day {stop.day}</Text>
                {stop.estimatedTime && (
                  <>
                    <Text style={styles.separator}> • </Text>
                    <Text style={styles.duration}>{stop.estimatedTime} min</Text>
                  </>
                )}
              </View>

              {stop.cost && (
                <Text style={styles.cost}>
                  ${stop.cost.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default memo(StopCard, (prevProps, nextProps) => {
  return (
    prevProps.stop.id === nextProps.stop.id &&
    prevProps.index === nextProps.index &&
    prevProps.stop.order === nextProps.stop.order
  );
});
