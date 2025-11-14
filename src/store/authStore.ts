import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      set({ loading: false });
    } catch (error: any) {
      console.error('❌ [AUTH] Sign in error:', error.code, error.message);
      let errorMessage = 'Failed to sign in';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }

      set({ error: errorMessage, loading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      set({ loading: false });
    } catch (error: any) {
      console.error('❌ [AUTH] Sign up error:', error.code, error.message);
      let errorMessage = 'Failed to create account';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }

      set({ error: errorMessage, loading: false });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      // Import tripStore dynamically to avoid circular dependency
      const { useTripStore } = await import('./tripStore');

      // Clear all trip data and listeners before signing out
      const tripStore = useTripStore.getState();
      tripStore.cleanupAllListeners();
      tripStore.setCurrentTrip(null);

      // Reset trip store state
      useTripStore.setState({
        trips: [],
        currentTrip: null,
        loading: false,
        error: null
      });

      console.log('✅ [AUTH] Cleared trip data before logout');

      await signOut(auth);
      set({ loading: false });
    } catch (error: any) {
      console.error('❌ [AUTH] Logout error:', error);
      set({ error: 'Failed to sign out', loading: false });
    }
  },

  initializeAuth: async () => {
    if (get().initialized) {
      return;
    }

    set({ loading: true, error: null });

    try {
      // Set up auth state listener (stays active for app lifetime)
      onAuthStateChanged(
        auth,
        (user) => {
          console.log('✅ [AUTH] Auth state changed:', user ? `User: ${user.email}` : 'No user');
          set({ user, loading: false, error: null, initialized: true });
        },
        (error) => {
          console.error('❌ [AUTH] Auth state change error:', error);
          set({
            error: `Authentication error: ${error.message}`,
            loading: false,
            initialized: true
          });
        }
      );
    } catch (error: any) {
      console.error('❌ [AUTH] Failed to initialize auth:', error);
      const errorMessage = error.message || 'Failed to initialize authentication';
      set({ 
        error: `Initialization failed: ${errorMessage}`, 
        loading: false, 
        initialized: true 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
