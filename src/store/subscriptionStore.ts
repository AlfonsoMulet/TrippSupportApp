import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInDays, addDays } from 'date-fns';

export type SubscriptionType = 'monthly' | 'yearly' | null;

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  pricePerMonth?: string;
  savings?: string;
  type: SubscriptionType;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$4.99',
    period: 'per month',
    type: 'monthly',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$24.99',
    period: 'per year',
    savings: 'Save 58%',
    type: 'yearly',
  },
];

interface SubscriptionState {
  isTrialActive: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemainingInTrial: number;
  hasActiveSubscription: boolean;
  subscriptionType: SubscriptionType;
  subscriptionEndDate: string | null;
  isLoading: boolean;

  // Actions
  initializeSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
  purchaseSubscription: (type: SubscriptionType) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<boolean>;
  resetSubscription: () => Promise<void>;
}

const TRIAL_DURATION_DAYS = 7;
const STORAGE_KEYS = {
  TRIAL_START: '@subscription_trial_start',
  SUBSCRIPTION_TYPE: '@subscription_type',
  SUBSCRIPTION_END: '@subscription_end',
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isTrialActive: false,
  trialStartDate: null,
  trialEndDate: null,
  daysRemainingInTrial: 0,
  hasActiveSubscription: false,
  subscriptionType: null,
  subscriptionEndDate: null,
  isLoading: true,

  initializeSubscription: async () => {
    try {
      set({ isLoading: true });

      const trialStart = await AsyncStorage.getItem(STORAGE_KEYS.TRIAL_START);
      const subscriptionType = (await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE)) as SubscriptionType;
      const subscriptionEnd = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_END);

      const now = new Date();

      // Check trial status
      if (trialStart) {
        const trialStartDate = new Date(trialStart);
        const trialEndDate = addDays(trialStartDate, TRIAL_DURATION_DAYS);
        const daysRemaining = differenceInDays(trialEndDate, now);

        const isTrialActive = daysRemaining >= 0;

        set({
          isTrialActive,
          trialStartDate: trialStart,
          trialEndDate: trialEndDate.toISOString(),
          daysRemainingInTrial: Math.max(0, daysRemaining),
        });
      }

      // Check subscription status
      if (subscriptionType && subscriptionEnd) {
        const endDate = new Date(subscriptionEnd);
        const hasActiveSubscription = endDate > now;

        set({
          hasActiveSubscription,
          subscriptionType,
          subscriptionEndDate: subscriptionEnd,
        });
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
      set({ isLoading: false });
    }
  },

  startTrial: async () => {
    try {
      const now = new Date().toISOString();
      const endDate = addDays(new Date(), TRIAL_DURATION_DAYS).toISOString();

      await AsyncStorage.setItem(STORAGE_KEYS.TRIAL_START, now);

      set({
        isTrialActive: true,
        trialStartDate: now,
        trialEndDate: endDate,
        daysRemainingInTrial: TRIAL_DURATION_DAYS,
      });

      console.log('✅ [Subscription] Trial started');
    } catch (error) {
      console.error('Failed to start trial:', error);
    }
  },

  purchaseSubscription: async (type: SubscriptionType) => {
    try {
      if (!type) {
        throw new Error('Subscription type is required to purchase.');
      }

      console.log(`💳 [Subscription] Purchasing ${type} subscription`);

      const now = new Date();
      const endDate = type === 'monthly'
        ? addDays(now, 30)
        : addDays(now, 365);

      // ✅ FIXED: Always store strings — and handle null safely
      await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TYPE, type);
      await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_END, endDate.toISOString());

      set({
        hasActiveSubscription: true,
        subscriptionType: type,
        subscriptionEndDate: endDate.toISOString(),
        isTrialActive: false, // End trial when subscription purchased
      });

      console.log('✅ [Subscription] Purchase successful');
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      throw error;
    }
  },

  cancelSubscription: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_TYPE);
      await AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_END);

      // Start a new 7-day trial when subscription is cancelled
      const now = new Date().toISOString();
      const endDate = addDays(new Date(), TRIAL_DURATION_DAYS).toISOString();

      await AsyncStorage.setItem(STORAGE_KEYS.TRIAL_START, now);

      set({
        hasActiveSubscription: false,
        subscriptionType: null,
        subscriptionEndDate: null,
        isTrialActive: true,
        trialStartDate: now,
        trialEndDate: endDate,
        daysRemainingInTrial: TRIAL_DURATION_DAYS,
      });

      console.log('✅ [Subscription] Cancelled - Started new 7-day trial');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  },

  restorePurchases: async () => {
    try {
      console.log('🔄 [Subscription] Restoring purchases');
      await get().initializeSubscription();
      console.log('✅ [Subscription] Restore complete');
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  },

  checkSubscriptionStatus: async () => {
    const { isTrialActive, hasActiveSubscription } = get();
    return isTrialActive || hasActiveSubscription;
  },

  resetSubscription: async () => {
    try {
      console.log('🔄 [Subscription] Resetting subscription data (DEV ONLY)');

      await AsyncStorage.removeItem(STORAGE_KEYS.TRIAL_START);
      await AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_TYPE);
      await AsyncStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_END);

      set({
        isTrialActive: false,
        trialStartDate: null,
        trialEndDate: null,
        daysRemainingInTrial: 0,
        hasActiveSubscription: false,
        subscriptionType: null,
        subscriptionEndDate: null,
      });

      console.log('✅ [Subscription] Reset complete - restart app to start new trial');
    } catch (error) {
      console.error('Failed to reset subscription:', error);
      throw error;
    }
  },
}));
