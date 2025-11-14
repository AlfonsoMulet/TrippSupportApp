import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useSubscriptionStore, SubscriptionType, subscriptionPlans } from '../store/subscriptionStore';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { theme } = useThemeStore();
  const {
    purchaseSubscription,
    restorePurchases,
    daysRemainingInTrial,
    isTrialActive,
    hasActiveSubscription,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if this is a locked paywall (trial expired, no subscription)
  const isLocked = !isTrialActive && !hasActiveSubscription;

  const features = [
    { icon: 'map-outline', text: 'Unlimited trips and destinations' },
    { icon: 'people-outline', text: 'Share trips with friends' },
    { icon: 'car-outline', text: 'Smart transport routing' },
    { icon: 'calendar-outline', text: 'Multi-day trip planning' },
    { icon: 'cloud-outline', text: 'Cloud sync across devices' },
  ];

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      await purchaseSubscription(selectedPlan);
      Alert.alert(
        'Welcome to Pro!',
        'Your subscription is now active. Enjoy all premium features!',
        [{ text: 'Start Planning', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully!');
    } catch (error) {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases.');
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    closeButton: {
      padding: 8,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    heroSection: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    trialBadge: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 16,
    },
    trialText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    featuresSection: {
      marginVertical: 32,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    featureText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
    },
    plansSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    planCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    planCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#f0f9ff',
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    planName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    bestValueBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    bestValueText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
    planPrice: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    planPeriod: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    planDetails: {
      marginTop: 8,
    },
    planDetail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    subscribeButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    subscribeButtonDisabled: {
      opacity: 0.5,
    },
    subscribeButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    restoreButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    restoreButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    footer: {
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    footerLink: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {!isLocked && (
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <View style={{ width: 40 }} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Plan unlimited trips, collaborate with friends, and travel smarter
          </Text>
          {daysRemainingInTrial > 0 && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>
                {daysRemainingInTrial} days left in trial
              </Text>
            </View>
          )}
        </View>

        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name={feature.icon as any}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.colors.primary}
              />
            </View>
          ))}
        </View>

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          {subscriptionPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan.type)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.planCard,
                  selectedPlan === plan.type && styles.planCardSelected,
                ]}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.savings && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>{plan.savings}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
                {plan.pricePerMonth && (
                  <View style={styles.planDetails}>
                    <Text style={styles.planDetail}>{plan.pricePerMonth}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            isProcessing && styles.subscribeButtonDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {daysRemainingInTrial > 0
                ? selectedPlan === 'monthly'
                  ? 'Upgrade to Monthly plan'
                  : 'Upgrade to Yearly plan'
                : selectedPlan === 'monthly'
                  ? ' $4.99/month'
                  : 'Go Yearly • $24.99/year'}
            </Text>
          )}
        </TouchableOpacity>

        

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {daysRemainingInTrial > 0
              ? ''
              : 'Billed automatically. Cancel anytime in your account settings.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
