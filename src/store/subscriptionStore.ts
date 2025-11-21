import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInDays, addDays } from 'date-fns';
import * as Localization from 'expo-localization';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { PRICING_DATA, DEFAULT_PRICING, PricingInfo } from '../utils/pricingData';
import { formatCurrency, getLocalizedPriceDisplay, calculateSavings } from '../utils/currencyFormatter';
import { REVENUECAT_CONFIG } from '../config/revenuecat';

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

/**
 * Get pricing information based on user's region
 */
const getUserRegionPricing = (): PricingInfo => {
  try {
    // Get user's region (country code)
    const locales = Localization.getLocales();
    const region = locales[0]?.regionCode || null;

    if (region && PRICING_DATA[region]) {
      console.log(`✅ [Pricing] Using pricing for region: ${region}`);
      return PRICING_DATA[region];
    }

    console.log(`⚠️ [Pricing] Region ${region} not found, using default USD pricing`);
    return DEFAULT_PRICING;
  } catch (error) {
    console.error('❌ [Pricing] Error detecting region:', error);
    return DEFAULT_PRICING;
  }
};

/**
 * Generate subscription plans with localized pricing
 */
const generateSubscriptionPlans = (): SubscriptionPlan[] => {
  const pricing = getUserRegionPricing();

  const monthlyDisplay = getLocalizedPriceDisplay(
    pricing.monthly.price,
    pricing.monthly.currency,
    'monthly'
  );

  const yearlyDisplay = getLocalizedPriceDisplay(
    pricing.yearly.price,
    pricing.yearly.currency,
    'yearly'
  );

  const savings = calculateSavings(pricing.monthly.price, pricing.yearly.price);

  return [
    {
      id: 'monthly',
      name: 'Monthly',
      price: monthlyDisplay.price,
      period: monthlyDisplay.period,
      type: 'monthly',
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: yearlyDisplay.price,
      period: yearlyDisplay.period,
      pricePerMonth: yearlyDisplay.pricePerMonth,
      savings: savings,
      type: 'yearly',
    },
  ];
};

// Generate plans with user's region pricing
export const subscriptionPlans: SubscriptionPlan[] = generateSubscriptionPlans();

interface SubscriptionState {
  isTrialActive: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemainingInTrial: number;
  hasActiveSubscription: boolean;
  subscriptionType: SubscriptionType;
  subscriptionEndDate: string | null;
  isLoading: boolean;

  // RevenueCat data
  customerInfo: CustomerInfo | null;
  availablePackages: PurchasesPackage[];

  // Actions
  initializeSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
  purchaseSubscription: (type: SubscriptionType) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<boolean>;
  resetSubscription: () => Promise<void>;
  fetchOfferings: () => Promise<void>;
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
  customerInfo: null,
  availablePackages: [],

  initializeSubscription: async () => {
    try {
      set({ isLoading: true });

      // Get local trial status
      const trialStart = await AsyncStorage.getItem(STORAGE_KEYS.TRIAL_START);
      const now = new Date();

      // Check trial status
      let isTrialActive = false;
      let daysRemaining = 0;

      if (trialStart) {
        const trialStartDate = new Date(trialStart);
        const trialEndDate = addDays(trialStartDate, TRIAL_DURATION_DAYS);
        daysRemaining = differenceInDays(trialEndDate, now);
        isTrialActive = daysRemaining >= 0;

        set({
          isTrialActive,
          trialStartDate: trialStart,
          trialEndDate: trialEndDate.toISOString(),
          daysRemainingInTrial: Math.max(0, daysRemaining),
        });
      }

      // Get RevenueCat customer info for real subscription status
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('📊 [RevenueCat] Customer info:', customerInfo);

        set({ customerInfo });

        // Check if user has active subscription via RevenueCat
        const hasActiveSubscription =
          typeof customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID] !== 'undefined';

        if (hasActiveSubscription) {
          const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
          const expirationDate = entitlement.expirationDate;
          const productId = entitlement.productIdentifier;

          // Determine subscription type from product ID
          let subscriptionType: SubscriptionType = null;
          if (productId === REVENUECAT_CONFIG.MONTHLY_PRODUCT_ID) {
            subscriptionType = 'monthly';
          } else if (productId === REVENUECAT_CONFIG.YEARLY_PRODUCT_ID) {
            subscriptionType = 'yearly';
          }

          set({
            hasActiveSubscription: true,
            subscriptionType,
            subscriptionEndDate: expirationDate || null,
          });

          console.log('✅ [RevenueCat] Active subscription found:', subscriptionType);
        } else {
          set({
            hasActiveSubscription: false,
            subscriptionType: null,
            subscriptionEndDate: null,
          });

          console.log('ℹ️ [RevenueCat] No active subscription');
        }
      } catch (rcError) {
        console.error('⚠️ [RevenueCat] Error fetching customer info:', rcError);
        // Fall back to local storage if RevenueCat fails
        const subscriptionType = (await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TYPE)) as SubscriptionType;
        const subscriptionEnd = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_END);

        if (subscriptionType && subscriptionEnd) {
          const endDate = new Date(subscriptionEnd);
          const hasActiveSubscription = endDate > now;

          set({
            hasActiveSubscription,
            subscriptionType,
            subscriptionEndDate: subscriptionEnd,
          });
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('❌ [Subscription] Failed to initialize:', error);
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

      console.log(`💳 [RevenueCat] Initiating ${type} subscription purchase`);

      // Get offerings from RevenueCat
      const offerings = await Purchases.getOfferings();

      if (offerings.current === null) {
        throw new Error('No offerings available. Check RevenueCat configuration.');
      }

      console.log('📦 [RevenueCat] Available offerings:', offerings.current);

      // Find the package for the selected subscription type
      let packageToPurchase: PurchasesPackage | null = null;

      // Try to find by product identifier
      const productId =
        type === 'monthly'
          ? REVENUECAT_CONFIG.MONTHLY_PRODUCT_ID
          : REVENUECAT_CONFIG.YEARLY_PRODUCT_ID;

      packageToPurchase = offerings.current.availablePackages.find(
        (pkg) => pkg.product.identifier === productId
      ) || null;

      // Fallback: Try monthly/annual packages
      if (!packageToPurchase) {
        if (type === 'monthly') {
          packageToPurchase = offerings.current.monthly;
        } else if (type === 'yearly') {
          packageToPurchase = offerings.current.annual;
        }
      }

      if (!packageToPurchase) {
        throw new Error(`No package found for ${type} subscription. Check product IDs in RevenueCat.`);
      }

      console.log(`🛒 [RevenueCat] Purchasing package:`, packageToPurchase.identifier);

      // Make the purchase
      const purchaseResult = await Purchases.purchasePackage(packageToPurchase);
      const { customerInfo } = purchaseResult;

      console.log('✅ [RevenueCat] Purchase successful!', customerInfo);

      // Check if entitlement is active
      const hasActiveSubscription =
        typeof customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID] !== 'undefined';

      if (hasActiveSubscription) {
        const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate;

        // Store locally as backup
        await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TYPE, type);
        if (expirationDate) {
          await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_END, expirationDate);
        }

        set({
          hasActiveSubscription: true,
          subscriptionType: type,
          subscriptionEndDate: expirationDate || null,
          isTrialActive: false, // End trial when subscription purchased
          customerInfo,
        });

        console.log('✅ [Subscription] Purchase complete and entitlement active');
      } else {
        throw new Error('Purchase succeeded but entitlement not active');
      }
    } catch (error: any) {
      console.error('❌ [RevenueCat] Purchase failed:', error);

      // Handle user cancellation gracefully
      if (error.userCancelled) {
        console.log('ℹ️ [RevenueCat] User cancelled purchase');
        throw new Error('Purchase cancelled');
      }

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
      console.log('🔄 [RevenueCat] Restoring purchases');

      // Restore purchases via RevenueCat
      const customerInfo = await Purchases.restorePurchases();

      console.log('📊 [RevenueCat] Restore result:', customerInfo);

      set({ customerInfo });

      // Check if user has active subscription after restore
      const hasActiveSubscription =
        typeof customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID] !== 'undefined';

      if (hasActiveSubscription) {
        const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate;
        const productId = entitlement.productIdentifier;

        // Determine subscription type
        let subscriptionType: SubscriptionType = null;
        if (productId === REVENUECAT_CONFIG.MONTHLY_PRODUCT_ID) {
          subscriptionType = 'monthly';
        } else if (productId === REVENUECAT_CONFIG.YEARLY_PRODUCT_ID) {
          subscriptionType = 'yearly';
        }

        // Store locally as backup
        if (subscriptionType) {
          await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TYPE, subscriptionType);
        }
        if (expirationDate) {
          await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_END, expirationDate);
        }

        set({
          hasActiveSubscription: true,
          subscriptionType,
          subscriptionEndDate: expirationDate || null,
        });

        console.log('✅ [RevenueCat] Purchases restored successfully');
      } else {
        console.log('ℹ️ [RevenueCat] No purchases to restore');
        throw new Error('No purchases found');
      }
    } catch (error) {
      console.error('❌ [RevenueCat] Restore failed:', error);
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

  fetchOfferings: async () => {
    try {
      console.log('🔄 [RevenueCat] Fetching offerings');
      const offerings = await Purchases.getOfferings();

      if (offerings.current !== null) {
        const packages = offerings.current.availablePackages;
        set({ availablePackages: packages });
        console.log('✅ [RevenueCat] Offerings fetched:', packages.length, 'packages');
      } else {
        console.log('⚠️ [RevenueCat] No offerings available');
        set({ availablePackages: [] });
      }
    } catch (error) {
      console.error('❌ [RevenueCat] Failed to fetch offerings:', error);
      set({ availablePackages: [] });
    }
  },
}));
