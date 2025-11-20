import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';

export interface TutorialStep {
  id: string;
  screen: 'welcome' | 'triplist' | 'tripdetail' | 'map' | 'profile' | 'complete';
  titleKey: string; // Translation key
  descriptionKey: string; // Translation key
  targetId?: string;
  position: 'top' | 'bottom' | 'center';
  action?: 'tap-trip' | 'tap-create' | 'wait-for-trip' | 'wait-for-stop' | 'navigate-to-map' | 'none';
  buttonText?: 'ok' | 'next' | 'finish'; // Custom button text
}

interface TutorialState {
  isActive: boolean;
  currentStep: number;
  hasCompletedTutorial: boolean;
  steps: TutorialStep[];
  
  // Actions
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  checkTutorialStatus: () => Promise<void>;
  getCurrentScreen: () => 'welcome' | 'triplist' | 'tripdetail' | 'map' | 'profile' | 'complete';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // Welcome
  {
    id: 'welcome',
    screen: 'welcome',
    titleKey: 'tutorial.welcome.title',
    descriptionKey: 'tutorial.welcome.description',
    position: 'center',
    action: 'none',
  },

  // Step 1: Click Create Trip Button
  {
    id: 'create-trip-button',
    screen: 'triplist',
    titleKey: 'tutorial.createTripButton.title',
    descriptionKey: 'tutorial.createTripButton.description',
    targetId: 'create-trip-fab',
    position: 'bottom',
    action: 'tap-create',
  },

  // Step 2: Fill Out Trip Form (Modal is open)
  {
    id: 'fill-trip-form',
    screen: 'triplist',
    titleKey: 'tutorial.fillTripForm.title',
    descriptionKey: 'tutorial.fillTripForm.description',
    position: 'center',
    action: 'wait-for-trip',
  },

  // Step 3: Tap on the Trip You Just Created
  {
    id: 'tap-trip-card',
    screen: 'triplist',
    titleKey: 'tutorial.tapTripCard.title',
    descriptionKey: 'tutorial.tapTripCard.description',
    targetId: 'tutorial-trip-card',
    position: 'bottom',
    action: 'tap-trip',
  },

  // Step 4: Inside Trip Detail - Now Leave
  {
    id: 'leave-trip-detail',
    screen: 'tripdetail',
    titleKey: 'tutorial.leaveTripDetail.title',
    descriptionKey: 'tutorial.leaveTripDetail.description',
    position: 'center',
    action: 'none',
    buttonText: 'ok',
  },

  // Step 5: Navigate to Map Tab
  {
    id: 'navigate-to-map',
    screen: 'triplist',
    titleKey: 'tutorial.navigateToMap.title',
    descriptionKey: 'tutorial.navigateToMap.description',
    targetId: 'map-tab-button',
    position: 'bottom',
    action: 'navigate-to-map',
  },

  // Step 6: Map Screen - View Stops
  {
    id: 'map-overview',
    screen: 'map',
    titleKey: 'tutorial.mapOverview.title',
    descriptionKey: 'tutorial.mapOverview.description',
    position: 'center',
    action: 'none',
  },

  // Step 7: Add Stop Button
  {
    id: 'add-stop-button',
    screen: 'map',
    titleKey: 'tutorial.addStopButton.title',
    descriptionKey: 'tutorial.addStopButton.description',
    targetId: 'add-stop-button',
    position: 'top',
    action: 'none',
  },

  // Step 8: View Routes
  {
    id: 'transport-mode',
    screen: 'map',
    titleKey: 'tutorial.transportMode.title',
    descriptionKey: 'tutorial.transportMode.description',
    targetId: 'transport-button',
    position: 'top',
    action: 'none',
  },

  // Step 9: Edit Mode
  {
    id: 'edit-itinerary',
    screen: 'map',
    titleKey: 'tutorial.editItinerary.title',
    descriptionKey: 'tutorial.editItinerary.description',
    targetId: 'edit-button',
    position: 'top',
    action: 'none',
  },

  // Step 10: Route Type
  {
    id: 'route-type',
    screen: 'map',
    titleKey: 'tutorial.routeType.title',
    descriptionKey: 'tutorial.routeType.description',
    targetId: 'route-type-button',
    position: 'bottom',
    action: 'none',
  },

  // Step 11: Profile Tab
  {
    id: 'profile-overview',
    screen: 'map',
    titleKey: 'tutorial.profileOverview.title',
    descriptionKey: 'tutorial.profileOverview.description',
    position: 'center',
    action: 'none',
  },

  // Complete
  {
    id: 'complete',
    screen: 'complete',
    titleKey: 'tutorial.complete.title',
    descriptionKey: 'tutorial.complete.description',
    position: 'center',
    action: 'none',
  },
];

const TUTORIAL_KEY = '@trip_planner_tutorial_completed';

// List of email addresses that should see the tutorial (dev accounts)
const DEV_ACCOUNTS = [
  'alfonsomulet@gmail.com',
  'dev@tripplanner.com',
  'test@tripplanner.com',
  // Add more dev account emails here
];

/**
 * Check if the current user is a dev account
 */
const isDevAccount = (): boolean => {
  const user = useAuthStore.getState().user;
  if (!user || !user.email) return false;

  return DEV_ACCOUNTS.includes(user.email.toLowerCase());
};

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  hasCompletedTutorial: false,
  steps: TUTORIAL_STEPS,
  
  checkTutorialStatus: async () => {
    try {
      // Only show tutorial for dev accounts
      if (!isDevAccount()) {
        set({ hasCompletedTutorial: true, isActive: false });
        return;
      }

      const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
      if (completed === 'true') {
        set({ hasCompletedTutorial: true, isActive: false });
      } else {
        // Start tutorial automatically for new dev users
        set({ hasCompletedTutorial: false, isActive: true });
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  },
  
  startTutorial: () => {
    // Only allow starting tutorial for dev accounts
    if (!isDevAccount()) {
      console.log('Tutorial is only available for dev accounts');
      return;
    }
    set({ isActive: true, currentStep: 0 });
  },
  
  skipTutorial: async () => {
    set({ isActive: false, currentStep: 0 });
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
      set({ hasCompletedTutorial: true });
    } catch (error) {
      console.error('Error saving tutorial skip:', error);
    }
  },
  
  nextStep: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().completeTutorial();
    }
  },
  
  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },
  
  completeTutorial: async () => {
    set({ isActive: false, currentStep: 0 });
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
      set({ hasCompletedTutorial: true });
    } catch (error) {
      console.error('Error saving tutorial completion:', error);
    }
  },
  
  resetTutorial: async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
      set({ hasCompletedTutorial: false, isActive: false, currentStep: 0 });
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  },

  getCurrentScreen: () => {
    const { steps, currentStep } = get();
    return steps[currentStep]?.screen || 'welcome';
  },
}));
