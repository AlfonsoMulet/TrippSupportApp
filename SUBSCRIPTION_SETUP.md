# Subscription System Setup Guide

Your Trip Planner app now has a **complete subscription system** with:
- 7-day free trial
- $4.99/month subscription
- $24.99/year subscription (Save 58%!)
- Beautiful paywall UI
- Subscription management

## 🎉 What's Already Working

### 1. **Trial System** ✅
- New users automatically get a 7-day free trial
- Trial starts when they first sign in
- Days remaining shown in Profile and Paywall

### 2. **Paywall UI** ✅
- Professional, native-looking design
- Shows pricing clearly with "Save 58%" badge on yearly
- Displays all premium features
- Modal presentation

### 3. **Profile Integration** ✅
- Shows subscription status with color-coded card:
  - **Green** = Active subscription
  - **Blue** = Trial active
  - **Orange** = Trial expired / needs upgrade
- Tap the card to open paywall

### 4. **State Management** ✅
- Tracks trial period
- Stores subscription type (monthly/yearly)
- Persists data with AsyncStorage
- Auto-initializes on app launch

---

## 🧪 Testing the System (Mock Mode)

Right now, the system works in **"mock mode"** - perfect for testing the UI and flow without real payments.

### How to Test:

1. **Sign in** - Trial starts automatically (7 days)
2. **Check Profile** - See trial card showing days remaining
3. **Tap subscription card** - Opens paywall
4. **Select a plan** - Choose monthly or yearly
5. **Tap "Start Free Trial"** - Simulates purchase
6. **Check Profile again** - Now shows "Pro" status

### Mock Purchase Flow:
```typescript
// In PaywallScreen.tsx, line ~110
const handleSubscribe = async () => {
  // This simulates a purchase - will be replaced with real IAP
  await purchaseSubscription(selectedPlan);
};
```

---

## 💳 Connecting Real Payments (Next Steps)

To connect **real App Store/Play Store payments**, you need to:

### Step 1: Create Developer Accounts

#### Apple App Store ($99/year):
1. Go to [Apple Developer](https://developer.apple.com)
2. Enroll in Apple Developer Program
3. Create App ID in Certificates, Identifiers & Profiles
4. Set up App Store Connect account

#### Google Play Store ($25 one-time):
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay one-time $25 registration fee
3. Create your app listing

### Step 2: Configure In-App Products

#### In App Store Connect:
1. Go to your app → Features → In-App Purchases
2. Create **Auto-Renewable Subscriptions**:
   - Product ID: `monthly_subscription`
   - Price: $4.99/month
   - Product ID: `yearly_subscription`
   - Price: $24.99/year
3. Set up subscription group
4. Configure 7-day free trial period

#### In Google Play Console:
1. Go to Monetize → Subscriptions
2. Create subscription products:
   - Product ID: `monthly_subscription`
   - Price: $4.99
   - Product ID: `yearly_subscription`
   - Price: $24.99
3. Enable 7-day trial

### Step 3: Install RevenueCat (Recommended)

RevenueCat makes IAP **much easier** and works across iOS and Android:

```bash
npm install react-native-purchases
```

Then update `subscriptionStore.ts`:

```typescript
import Purchases from 'react-native-purchases';

// Initialize in App.tsx
await Purchases.configure({
  apiKey: 'your_revenuecat_api_key',
});

// Replace mock purchase with real purchase:
purchaseSubscription: async (type: SubscriptionType) => {
  try {
    const offerings = await Purchases.getOfferings();
    const packageId = type === 'monthly' ? 'monthly' : 'yearly';
    const { customerInfo } = await Purchases.purchasePackage(
      offerings.current[packageId]
    );

    // Update state based on customerInfo
    set({ hasActiveSubscription: true, subscriptionType: type });
  } catch (error) {
    // Handle error
  }
}
```

### Step 4: Test with Sandbox

Before going live, test with:
- **iOS**: Sandbox testers in App Store Connect
- **Android**: Test accounts in Google Play Console

---

## 📱 How Users Will Experience It

### First Time User:
1. Signs up / signs in
2. Sees "Trial - 7 days left" in Profile
3. Can use all features for free for 7 days
4. Gets reminder when trial is ending

### After Trial Ends:
1. Profile shows "Free" with upgrade prompt
2. Tapping opens paywall
3. Must subscribe to continue

### Subscribed User:
1. Profile shows "Pro - Monthly" or "Pro - Yearly"
2. All features unlocked
3. Can manage/cancel via App Store/Play Store

---

## 🎨 Customization

### Change Pricing:
Edit `src/store/subscriptionStore.ts`:
```typescript
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'monthly',
    price: '$4.99',  // Change here
    // ...
  },
];
```

### Change Trial Duration:
Edit `src/store/subscriptionStore.ts`:
```typescript
const TRIAL_DURATION_DAYS = 7; // Change to any number
```

### Customize Paywall UI:
Edit `src/screens/PaywallScreen.tsx` - all colors, text, and features list

---

## 🔒 Current Features (All Unlocked During Trial/Subscription)

1. Unlimited trips
2. Collaboration with friends
3. Smart transport routing
4. Cloud sync
5. Travel reminders

### To Add Feature Locks:

When you're ready to restrict features, add checks like this:

```typescript
// Example: Lock creating trips after 3 for free users
const { checkSubscriptionStatus } = useSubscriptionStore();

const createTrip = async () => {
  const hasAccess = await checkSubscriptionStatus();

  if (!hasAccess && trips.length >= 3) {
    // Show paywall
    navigation.navigate('Paywall');
    return;
  }

  // Create trip...
};
```

---

## 📊 Analytics & Metrics

Consider tracking:
- Trial start rate
- Trial-to-paid conversion
- Monthly vs yearly split
- Churn rate

Use RevenueCat's built-in analytics or Firebase Analytics.

---

## 🛠️ Files Modified

- ✅ `src/store/subscriptionStore.ts` - Subscription logic
- ✅ `src/screens/PaywallScreen.tsx` - Paywall UI
- ✅ `src/screens/ProfileScreen.tsx` - Subscription status display
- ✅ `App.tsx` - Navigation & initialization

---

## 💡 Pro Tips

1. **Start with mock mode** - Test all flows before paying for developer accounts
2. **Use RevenueCat** - Saves hundreds of hours of IAP implementation
3. **A/B test pricing** - Try different trial lengths and prices
4. **Offer yearly first** - It's the best value, should be default
5. **Clear messaging** - Always show what users get for their money

---

## 🚀 Going Live Checklist

- [ ] Set up Apple Developer account
- [ ] Set up Google Play Console account
- [ ] Configure IAP products in both stores
- [ ] Install and configure RevenueCat (or react-native-iap)
- [ ] Replace mock purchase code with real IAP
- [ ] Test with sandbox accounts
- [ ] Set up analytics tracking
- [ ] Test trial flow end-to-end
- [ ] Test subscription cancellation
- [ ] Test restore purchases
- [ ] Submit for review

---

## 🆘 Need Help?

The code is structured to make switching from mock to real IAP easy:
- All purchase logic is in `subscriptionStore.ts`
- Just replace the `purchaseSubscription` function
- Everything else stays the same

For RevenueCat setup, check their excellent docs:
https://docs.revenuecat.com/docs/react-native

---

**You're all set!** The subscription system is ready to test and can be connected to real payments whenever you're ready to launch. 🎉
