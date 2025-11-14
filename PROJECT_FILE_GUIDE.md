# 📁 Complete File Guide - Trip Planner App

## 🎯 Quick Reference: When to Focus on Each File

---

## 📱 **ROOT FILES**

### `App.tsx`
**What it does:** Main app entry point, navigation setup, deep linking
**Focus when:**
- App won't start
- Navigation errors
- Deep linking issues (sharing trips)
- Tab bar problems

### `package.json`
**What it does:** Lists all dependencies and scripts
**Focus when:**
- Installing new packages
- Updating dependencies
- Build/run scripts

---

## 📂 **src/screens/** - Main App Screens

### `AuthScreen.tsx`
**What it does:** Login and registration
**Focus when:**
- Login issues
- Sign up problems
- Firebase auth errors
- Password reset

### `MapScreen.tsx`
**What it does:** Map view showing trip routes and stops
**Focus when:**
- Map not showing
- Markers not appearing
- Route drawing issues
- GPS/location problems

### `TripListScreen.tsx`
**What it does:** List of all your trips
**Focus when:**
- Trips not loading
- List display issues
- Search/filter problems
- Trip cards not showing

### `TripDetailScreen.tsx`
**What it does:** Shows full trip itinerary with stops
**Focus when:**
- Trip details not loading
- Stop list issues
- Drag-and-drop not working
- Transport segments problems
- Budget calculations wrong

### `ProfileScreen.tsx`
**What it does:** User profile and account settings
**Focus when:**
- Profile info not showing
- Avatar issues
- Account settings problems

### `SettingsScreen.tsx`
**What it does:** App settings (theme, language, etc.)
**Focus when:**
- Theme switching broken
- Language not changing
- Settings not saving

### `AboutScreen.tsx`
**What it does:** App info, version, credits
**Focus when:**
- Need to update app info

### `HelpSupportScreen.tsx`
**What it does:** Help and support information
**Focus when:**
- Adding help content

### `AcceptTripScreen.tsx`
**What it does:** Handles shared trip invitations
**Focus when:**
- Sharing links broken
- Can't join shared trips

---

## 🧩 **src/components/** - Reusable UI Components

### `StopCard.tsx`
**What it does:** Individual stop in itinerary (displays name, location, etc.)
**Focus when:**
- Stop display issues
- Drag and drop problems
- Stop card styling

### `TransportCard.tsx`
**What it does:** Shows transport between stops (car, walk, bike, flight)
**Focus when:**
- Transport icons wrong
- Distance/duration display issues
- Mode switching broken

### `AddStopModal.tsx`
**What it does:** Modal to add/edit stops with Google Places search
**Focus when:**
- Can't add stops
- Search not working
- Google Places API issues
- Form validation problems

### `CreateTripModal.tsx`
**What it does:** Modal to create/edit trips
**Focus when:**
- Can't create trips
- Date picker issues
- Form problems

### `ShareTripModal.tsx`
**What it does:** Modal to share trips with QR code
**Focus when:**
- Sharing broken
- QR code not generating
- Link copying issues

### `ManageMembersModal.tsx`
**What it does:** Manage collaborative trip members
**Focus when:**
- Can't remove members
- Role changes not working

### `CollaborativeMembers.tsx`
**What it does:** Displays trip members
**Focus when:**
- Members list not showing

### `SimpleDragDrop.tsx`
**What it does:** Handles drag-and-drop for stops
**Focus when:**
- Drag and drop broken
- Reordering issues

### `SlidingPanel.tsx`
**What it does:** Bottom sliding panel UI
**Focus when:**
- Panel animation issues

### `ModalHeader.tsx` ✨ **(NEW)**
**What it does:** Reusable modal header component
**Focus when:**
- Modal headers need updating

### `tutorial/TutorialOverlay.tsx`
**What it does:** First-time user tutorial
**Focus when:**
- Tutorial not working
- Adding tutorial steps

---

## 🗄️ **src/store/** - State Management (Zustand)

### `tripStore.ts`
**What it does:** Manages all trip data, stops, CRUD operations
**Focus when:**
- Trips not saving
- Stops not updating
- Data sync issues
- Transport segments broken

### `authStore.ts`
**What it does:** User authentication state
**Focus when:**
- Login/logout broken
- User data issues

### `themeStore.ts`
**What it does:** Dark/light theme management
**Focus when:**
- Theme switching broken
- Colors wrong

### `settingsStore.ts`
**What it does:** App settings (language, date format, etc.)
**Focus when:**
- Settings not persisting

### `routeStore.ts`
**What it does:** Map routing and directions
**Focus when:**
- Routes not calculating
- Map directions broken

### `tutorialStore.ts`
**What it does:** Tutorial state management
**Focus when:**
- Tutorial flow broken

---

## 🛠️ **src/services/** - Business Logic & APIs

### `LocationService.ts`
**What it does:** GPS, location, distance calculations
**Focus when:**
- Location not working
- Distance calculations wrong
- GPS issues

### `RoutingService.ts`
**What it does:** Calculates routes between stops
**Focus when:**
- Routes not showing on map
- Travel time wrong

### `RoutingConfig.ts`
**What it does:** Routing configuration
**Focus when:**
- Changing routing behavior

### `AirportService.ts`
**What it does:** Airport detection for long distances
**Focus when:**
- Flights not detected
- Airport routing issues

### `SharingService.ts`
**What it does:** Trip sharing, QR codes, invitations
**Focus when:**
- Sharing broken
- Invitations not working

---

## 🎨 **src/styles/** - Styling

### `createThemedStyles.ts` ✨ **(NEW)**
**What it does:** Shared theme-based styles
**Focus when:**
- Reducing style duplication
- Theme consistency issues

---

## 🔧 **src/utils/** - Helper Functions

### `stopHelpers.ts` ✨ **(NEW)**
**What it does:** Stop sorting, grouping, reordering
**Focus when:**
- Stop manipulation logic
- Day grouping issues

### `transportOptimizer.ts`
**What it does:** Auto-detects best transport mode by distance
**Focus when:**
- Transport mode logic
- Distance-based decisions

### `mapUtils.ts`
**What it does:** Map helpers (bounds, markers, etc.)
**Focus when:**
- Map calculation issues

### `polyline.ts`
**What it does:** Decodes route polylines
**Focus when:**
- Route drawing broken

### `tutorialHelpers.ts`
**What it does:** Tutorial utility functions
**Focus when:**
- Tutorial logic

---

## 🌐 **src/i18n/** - Translations

### `translations.ts`
**What it does:** All text strings in 5 languages
**Focus when:**
- Adding new text
- Fixing translations
- Adding languages

### `useTranslation.ts`
**What it does:** Translation hook
**Focus when:**
- Language switching broken

---

## ⚙️ **src/config/** - Configuration

### `firebase.ts`
**What it does:** Firebase initialization
**Focus when:**
- Firebase connection issues
- API keys

---

## 🎭 **src/contexts/** - React Contexts

### `ThemeAnimationContext.tsx`
**What it does:** Animated theme transitions
**Focus when:**
- Theme animations broken

---

## 🪝 **src/hooks/** - Custom Hooks

### `useCachedResources.ts`
**What it does:** Loads fonts and assets
**Focus when:**
- App won't load
- Font issues

---

## 📊 **src/types/** - TypeScript Types

### `trip.ts`
**What it does:** Trip and Stop types
**Focus when:**
- TypeScript errors about trips

### `navigation.ts`
**What it does:** Navigation types
**Focus when:**
- Navigation TypeScript errors

### `theme.ts`
**What it does:** Theme types
**Focus when:**
- Theme TypeScript errors

### `routing.ts`
**What it does:** Routing types
**Focus when:**
- Routing TypeScript errors

### `sharing.ts`
**What it does:** Sharing types
**Focus when:**
- Sharing TypeScript errors

---

## 📊 **src/data/** - Static Data

### `airports.ts`
**What it does:** Airport database
**Focus when:**
- Adding airports
- Flight detection issues

---

## 🎯 **Common Scenarios - Which Files to Focus On**

### 🐛 **"App Won't Start"**
1. `App.tsx`
2. `src/config/firebase.ts`
3. `src/hooks/useCachedResources.ts`

### 🗺️ **"Map Issues"**
1. `MapScreen.tsx`
2. `src/services/LocationService.ts`
3. `src/services/RoutingService.ts`
4. `src/utils/mapUtils.ts`

### 📝 **"Can't Add/Edit Stops"**
1. `AddStopModal.tsx`
2. `src/store/tripStore.ts`
3. `StopCard.tsx`

### 🚗 **"Transport Mode Problems"**
1. `TransportCard.tsx`
2. `src/utils/transportOptimizer.ts`
3. `src/store/tripStore.ts`

### 🎨 **"Theme/Style Issues"**
1. `src/store/themeStore.ts`
2. `src/styles/createThemedStyles.ts`
3. `src/contexts/ThemeAnimationContext.tsx`

### 🔀 **"Drag and Drop Broken"**
1. `SimpleDragDrop.tsx`
2. `StopCard.tsx`
3. `TripDetailScreen.tsx`

### 🔐 **"Login/Auth Problems"**
1. `AuthScreen.tsx`
2. `src/store/authStore.ts`
3. `src/config/firebase.ts`

### 🌍 **"Translation Issues"**
1. `src/i18n/translations.ts`
2. `src/i18n/useTranslation.ts`

### 📤 **"Sharing Not Working"**
1. `ShareTripModal.tsx`
2. `AcceptTripScreen.tsx`
3. `src/services/SharingService.ts`

### 💾 **"Data Not Saving"**
1. `src/store/tripStore.ts`
2. `src/config/firebase.ts`

---

## 💡 **Pro Tips**

### **For TypeScript Errors:**
Tell me the file name and line number from the error

### **For UI Issues:**
Focus on the screen file + related components

### **For Logic Issues:**
Focus on the store + service files

### **For Styling:**
Focus on styles folder + the specific component

---

## 📝 **Example Requests**

**Good:**
```
"Fix TripDetailScreen.tsx - stops not reordering"
"Update AddStopModal.tsx - search not working"
"Fix authStore.ts - login failing"
```

**Even Better:**
```
"TripDetailScreen.tsx line 156 - TypeScript error [paste error]"
"AddStopModal.tsx - Google Places returning no results"
```

---

**Last Updated:** November 9, 2025
**Total Files:** 54
**Lines of Code:** ~14,300
