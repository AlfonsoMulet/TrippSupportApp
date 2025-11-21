# Subscription Setup Guide

Your app now has **real payment integration** using RevenueCat! 🎉

## What Was Added

✅ **react-native-purchases** - RevenueCat SDK for in-app purchases
✅ **Real payment processing** - Actual subscriptions will charge users
✅ **Receipt validation** - Server-side validation via RevenueCat
✅ **Cross-platform support** - iOS and Android ready
✅ **Restore purchases** - Users can restore on new devices
✅ **Trial management** - 7-day trial + subscription flow

## Setup Steps (Required Before Going Live)

### 1. Create RevenueCat Account

1. Go to https://app.revenuecat.com/
2. Sign up for free account
3. Create a new project

### 2. Get Your API Keys

1. In RevenueCat dashboard: **Project Settings → API Keys**
2. Copy your **iOS API Key** and **Android API Key**
3. Open `src/config/revenuecat.ts`
4. Replace the placeholder API keys:

```typescript
export const REVENUECAT_CONFIG = {
  IOS_API_KEY: 'your_actual_ios_api_key_here',
  ANDROID_API_KEY: 'your_actual_android_api_key_here',
  // ...
};
```

### 3. Configure App Store Connect (iOS)

#### A. Create Bundle ID
1. Go to https://developer.apple.com/account
2. **Certificates, Identifiers & Profiles → Identifiers**
3. Create App ID (e.g., `com.yourcompany.tripplanner`)

#### B. Create Subscription Products
1. Go to https://appstoreconnect.apple.com/
2. Navigate to your app → **Subscriptions**
3. Create a **Subscription Group** (e.g., "Tripp Pro")
4. Add two **Auto-Renewable Subscriptions**:

   **Monthly Subscription:**
   - Product ID: `tripp_monthly_subscription`
   - Reference Name: "Tripp Pro Monthly"
   - Subscription Duration: 1 Month
   - Price: Set using pricing tier (should match your CSV pricing data)

   **Yearly Subscription:**
   - Product ID: `tripp_yearly_subscription`
   - Reference Name: "Tripp Pro Yearly"
   - Subscription Duration: 1 Year
   - Price: Set using pricing tier

5. Submit subscription products for review

### 4. Link App Store to RevenueCat

1. In RevenueCat: **Project Settings → Apple App Store**
2. Choose connection method:
   - **Option A (Recommended):** App Store Connect API Key
   - **Option B:** In-App Purchase Key (.p8 file)
3. Add your bundle ID
4. Test the connection

### 5. Configure Products in RevenueCat

1. In RevenueCat: **Products**
2. Click **New**
3. Add product: `tripp_monthly_subscription`
4. Select platform: iOS (and Android if applicable)
5. Repeat for `tripp_yearly_subscription`

### 6. Create Entitlements

1. In RevenueCat: **Entitlements**
2. Create new entitlement: `pro`
3. Attach products:
   - `tripp_monthly_subscription`
   - `tripp_yearly_subscription`

### 7. Update Product IDs (If Needed)

If you used different product IDs in App Store Connect, update them in `src/config/revenuecat.ts`:

```typescript
export const REVENUECAT_CONFIG = {
  // ...
  MONTHLY_PRODUCT_ID: 'your_monthly_product_id',
  YEARLY_PRODUCT_ID: 'your_yearly_product_id',
  ENTITLEMENT_ID: 'pro',
};
```

## Testing

### Sandbox Testing (Before Going Live)

1. **Create Sandbox Tester:**
   - App Store Connect → **Users and Access → Sandbox Testers**
   - Create new tester with unique email

2. **Test on Device:**
   - Sign out of App Store on device
   - Run your app
   - When prompted, sign in with sandbox tester account
   - Test purchasing subscriptions
   - Verify trial functionality

3. **Test Restore Purchases:**
   - Uninstall and reinstall app
   - Use "Restore Purchases" button
   - Verify subscription restores

### Development Mode

RevenueCat debug logs are enabled in development mode. Check console for:
- `✅ [RevenueCat] Initialized successfully`
- `📦 [RevenueCat] Available offerings`
- `✅ [RevenueCat] Purchase successful!`

## Important Notes

⚠️ **Before Building:**
- Update API keys in `src/config/revenuecat.ts`
- Create products in App Store Connect
- Link App Store to RevenueCat
- Test with sandbox account

⚠️ **Pricing:**
- Your app has localized pricing for 150+ countries
- File: `src/utils/pricingData.ts`
- Make sure App Store pricing tiers match these prices

⚠️ **Trial System:**
- 7-day trial is managed locally (not via App Store)
- After trial expires, users MUST subscribe to access app
- Trial starts automatically for new users

## How It Works

### Purchase Flow
1. User taps "Subscribe" in [PaywallScreen.tsx](src/screens/PaywallScreen.tsx)
2. App fetches offerings from RevenueCat
3. RevenueCat initiates App Store purchase dialog
4. User completes purchase via Apple
5. RevenueCat validates receipt server-side
6. App grants access via entitlement check
7. Subscription stored locally as backup

### Key Files
- **[src/config/revenuecat.ts](src/config/revenuecat.ts)** - Configuration & API keys
- **[src/store/subscriptionStore.ts](src/store/subscriptionStore.ts)** - Payment logic
- **[App.tsx](App.tsx)** - RevenueCat initialization
- **[src/screens/PaywallScreen.tsx](src/screens/PaywallScreen.tsx)** - UI

## Troubleshooting

### "No offerings available"
- Check API keys in `src/config/revenuecat.ts`
- Verify products created in RevenueCat dashboard
- Ensure App Store is linked to RevenueCat

### "Product not found"
- Verify product IDs match exactly
- Check products are in "Ready to Submit" or "Approved" state
- Wait a few minutes after creating products

### Purchase fails
- Test with sandbox account, not production
- Check bundle ID matches everywhere
- Verify subscription is active in App Store Connect

## Production Checklist

Before submitting to App Store:

- [ ] API keys updated in `src/config/revenuecat.ts`
- [ ] Products created in App Store Connect
- [ ] Products created in RevenueCat
- [ ] Entitlements configured
- [ ] App Store linked to RevenueCat
- [ ] Tested with sandbox account
- [ ] Tested restore purchases
- [ ] Tested trial expiration
- [ ] Privacy policy updated with subscription info
- [ ] App Store review notes mention subscription testing

## Support

- **RevenueCat Docs:** https://docs.revenuecat.com/
- **RevenueCat Support:** https://community.revenuecat.com/
- **App Store Connect:** https://appstoreconnect.apple.com/

---

**Ready to test?** Update your API keys and start testing with a sandbox account!
