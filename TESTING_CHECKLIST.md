# Production Build Testing Checklist

## CRITICAL: Test the ACTUAL production build before submitting

Apple is seeing a white screen on:
- iPad Air (5th generation) - iPadOS 26.1
- iPhone 13 mini - iOS 26.1

## Testing Steps

### Step 1: Create a Production Test Build
```bash
# Build for iOS production (not submit yet, just build)
eas build --profile production --platform ios --non-interactive
```

Wait for build to complete (check status with `eas build:list`)

### Step 2: Download and Install the Test Build
```bash
# List recent builds
eas build:list --limit 5

# Download the latest production build
eas build:view [BUILD_ID]
```

**CRITICAL**: Install this .ipa file on your actual devices:
- Your iPad Air (5th gen) if you have one
- Your iPhone 13 mini
- Use TestFlight OR install via Xcode/direct install

### Step 3: Test on Physical Devices
- [ ] Completely uninstall any existing versions
- [ ] Install the production .ipa
- [ ] Launch app in **airplane mode** (to test offline behavior)
- [ ] Launch app with **normal internet**
- [ ] Check console logs in Xcode for errors
- [ ] Verify Firebase connection works
- [ ] Verify authentication works
- [ ] Test all main screens

### Step 4: Check for Common Issues

#### Issue 1: Firebase Not Initialized
Check console for:
```
❌ [Firebase Error] Firebase configuration is incomplete
```

If you see this, environment variables didn't get embedded properly.

#### Issue 2: App Stuck in Loading State
The app might be stuck at line 282-312 in App.tsx if:
- `loading` never becomes false
- `isLoadingComplete` never becomes true

#### Issue 3: Silent Error Caught by ErrorBoundary
ErrorBoundary might be catching errors silently.

### Step 5: Add Production Debug Logging

If you still see white screen, you need to add logging to find where it's failing:

1. Add console.error statements in App.tsx initialization
2. Rebuild production build
3. Check device console in Xcode

## How to Check Device Console in Xcode

1. Connect your iPhone/iPad via USB
2. Open Xcode
3. Window > Devices and Simulators
4. Select your device
5. Click "Open Console"
6. Install your production build
7. Launch the app
8. Watch console for errors

## Red Flags to Look For

- ❌ Firebase errors
- ❌ "undefined is not an object" errors
- ❌ RevenueCat initialization failures
- ❌ Network request failures
- ❌ AsyncStorage errors
- ❌ Native module not found errors

## Success Criteria

✅ App launches to login screen (or main screen if logged in)
✅ No white screen
✅ No console errors
✅ Firebase initializes successfully
✅ Navigation works
✅ Works on both iPhone and iPad

## If All Tests Pass

Only then submit to App Store:
```bash
eas build --profile production --platform ios --auto-submit
```
