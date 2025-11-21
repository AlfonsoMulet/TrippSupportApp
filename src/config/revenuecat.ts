/**
 * RevenueCat Configuration
 *
 * Setup Instructions:
 * 1. Sign up at https://app.revenuecat.com/
 * 2. Create a new app in RevenueCat dashboard
 * 3. Add your Apple App Store credentials
 * 4. Copy your API keys and paste them below
 * 5. Create entitlements and products in RevenueCat dashboard
 */

// RevenueCat API Keys - Replace with your actual keys from https://app.revenuecat.com/
export const REVENUECAT_CONFIG = {
  // Get these from RevenueCat Dashboard -> Project Settings -> API Keys
  IOS_API_KEY: 'appl_EIGXBiWMCOPVrEuFJrDcPSwxJTB', // Your test/development API key
  ANDROID_API_KEY: 'test_zATocryExmHCTxTDmcE5VmmMLto', // Your test/development API key

  // Product identifiers - must match what you create in App Store Connect AND RevenueCat
  MONTHLY_PRODUCT_ID: 'com.alfonsomulet.tripplanner.pro.monthly',
  YEARLY_PRODUCT_ID: 'com.alfonsomulet.tripplanner.pro.yearly',

  // Entitlement identifier - create this in RevenueCat dashboard
  ENTITLEMENT_ID: 'pro',
};

/**
 * Setup Steps:
 *
 * 1. CREATE APP IN REVENUECAT:
 *    - Go to https://app.revenuecat.com/
 *    - Create account or login
 *    - Create new project
 *    - Get API keys from Project Settings
 *
 * 2. CONFIGURE APP STORE CONNECT:
 *    - Go to https://appstoreconnect.apple.com/
 *    - Navigate to your app -> Subscriptions
 *    - Create Subscription Group
 *    - Create two auto-renewable subscriptions:
 *      * Monthly: tripp_monthly_subscription
 *      * Yearly: tripp_yearly_subscription
 *    - Set pricing tiers to match your pricing data
 *
 * 3. LINK APP STORE TO REVENUECAT:
 *    - In RevenueCat: Project Settings -> Apple App Store
 *    - Connect using App Store Connect API or In-App Purchase Key
 *    - Add bundle ID: com.yourcompany.tripplanner (or your actual bundle ID)
 *
 * 4. CREATE PRODUCTS IN REVENUECAT:
 *    - In RevenueCat: Products
 *    - Add product: tripp_monthly_subscription
 *    - Add product: tripp_yearly_subscription
 *
 * 5. CREATE ENTITLEMENT:
 *    - In RevenueCat: Entitlements
 *    - Create entitlement: "pro"
 *    - Attach both products to this entitlement
 *
 * 6. UPDATE API KEYS:
 *    - Copy iOS API key and paste in IOS_API_KEY above
 *    - Copy Android API key and paste in ANDROID_API_KEY above
 *
 * 7. TEST:
 *    - Use Sandbox testing in development
 *    - Test with sandbox Apple ID
 */
