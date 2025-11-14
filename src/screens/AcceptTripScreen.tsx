import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SharingService } from '../services/SharingService';
import { SharedTripData } from '../types/sharing';
import { useAuthStore } from '../store/authStore';
import { useTripStore } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../i18n/useTranslation';

export default function AcceptTripScreen() {
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [tripData, setTripData] = useState<SharedTripData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { loadUserTrips } = useTripStore();
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  const { token } = route.params as { token: string };

  useEffect(() => {
    loadTripData();
  }, [token]);

  const loadTripData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await SharingService.getTripFromShareToken(token);

      if (!data) {
        setError(t('acceptTrip.invalidLink'));
      } else {
        setTripData(data);
      }
    } catch (err) {
      console.error('Failed to load trip data:', err);
      setError(t('acceptTrip.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !tripData) return;

    try {
      setAccepting(true);

      const result = await SharingService.acceptSharedTrip(
        token,
        user.uid,
        user.email || '',
        user.displayName || 'User'
      );

      if (result.success) {
        Alert.alert(
          t('acceptTrip.successTitle'),
          result.message,
          [
            {
              text: t('common.ok'),
              onPress: async () => {
                await loadUserTrips();
                navigation.navigate('MainTabs' as never);
              },
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), result.message);
      }
    } catch (err) {
      console.error('Failed to accept trip:', err);
      Alert.alert(t('common.error'), t('acceptTrip.failedToAccept'));
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      t('acceptTrip.declineTrip'),
      t('acceptTrip.declineConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('acceptTrip.decline'),
          style: 'destructive',
          onPress: () => navigation.navigate('MainTabs' as never),
        },
      ]
    );
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorMessage: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    errorButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    errorButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    invitationCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    invitationHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    invitationIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    invitationTitle: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    sharedBy: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    tripCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    },
    tripName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    tripDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 16,
    },
    tripStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    collaborativeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    collaborativeBadgeText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
      marginLeft: 6,
    },
    infoBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    actions: {
      gap: 12,
    },
    acceptButton: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    acceptButtonDisabled: {
      opacity: 0.5,
    },
    acceptButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    declineButton: {
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    declineButtonText: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('acceptTrip.loadingDetails')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tripData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.textTertiary}
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>{t('acceptTrip.unableToLoad')}</Text>
          <Text style={styles.errorMessage}>
            {error || t('acceptTrip.invalidLink')}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.navigate('MainTabs' as never)}
          >
            <Text style={styles.errorButtonText}>{t('acceptTrip.goToMyTrips')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('acceptTrip.title')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.invitationCard}>
          <View style={styles.invitationHeader}>
            <View style={styles.invitationIcon}>
              <Ionicons name="share-social" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.invitationTitle}>{t('acceptTrip.youveBeenInvited')}</Text>
            <Text style={styles.sharedBy}>{tripData.ownerName}</Text>
          </View>

          <View style={styles.tripCard}>
            <Text style={styles.tripName}>{tripData.tripName}</Text>
            
            {tripData.tripDescription && (
              <Text style={styles.tripDescription}>{tripData.tripDescription}</Text>
            )}

            <View style={styles.tripStats}>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>
                  {getDuration(tripData.startDate, tripData.endDate)}
                </Text>
                <Text style={styles.statLabel}>{t('acceptTrip.days')}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{tripData.stopsCount}</Text>
                <Text style={styles.statLabel}>{t('acceptTrip.stopsLabel')}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>
                  {formatDateRange(tripData.startDate, tripData.endDate)}
                </Text>
                <Text style={styles.statLabel}>{t('acceptTrip.dates')}</Text>
              </View>
            </View>
          </View>

          {tripData.isCollaborative && (
            <View style={styles.collaborativeBadge}>
              <Ionicons name="people" size={16} color={theme.colors.primary} />
              <Text style={styles.collaborativeBadgeText}>{t('acceptTrip.collaborativeTrip')}</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {tripData.isCollaborative
                ? t('acceptTrip.collaborativeInfo')
                : t('acceptTrip.copyInfo')}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.acceptButtonText}>{t('acceptTrip.addingTrip')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.acceptButtonText}>
                    {tripData.isCollaborative ? t('acceptTrip.joinTrip') : t('acceptTrip.addToMyTrips')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              disabled={accepting}
            >
              <Ionicons name="close-circle-outline" size={24} color={theme.colors.text} />
              <Text style={styles.declineButtonText}>{t('acceptTrip.decline')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
