import { create } from 'zustand';
import { 
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from './authStore';
import { TripMember } from '../types/sharing';

import { LocationService } from '../services/LocationService';

export type TransportMode = 'driving' | 'walking' | 'bicycling' | 'flight';

export interface TransportSegment {
  id: string;
  tripId: string;
  fromStopId: string;
  toStopId: string;
  mode: TransportMode;
  distance: number; // in meters
  duration: number; // in seconds
  createdAt: string;
  updatedAt: string;
}

export interface Stop {
  id: string;
  tripId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  order: number;
  day: number;
  notes: string;
  category: 'food' | 'activity' | 'hotel' | 'sightseeing' | 'transport' | 'other';
  createdAt: string;
  // Optional fields
  estimatedTime?: number;
  cost?: number;
  tags?: string;
  website?: string;
  phone?: string;
  companions?: string;
}

export interface Trip {
  id: string;
  userId: string;
  ownerId: string; // Original creator
  sharedWith: string[]; // Array of user IDs with access
  isCollaborative: boolean; // If true, all members can edit
  shareToken?: string; // Current active share token
  members?: TripMember[]; // Array of members with their roles
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  stops: Stop[];
  transportSegments: TransportSegment[];
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: string; // User ID of last person to modify
}

// Transport mode time estimates (average speeds)
const TRANSPORT_SPEEDS = {
  walking: 5,    // 5 km/h
  driving: 50,   // 50 km/h
  bicycling: 15, // 15 km/h
  flight: 800,   // 800 km/h for flights
};

const estimateTransportTime = (distanceKm: number, mode: TransportMode): number => {
  const speedKmh = TRANSPORT_SPEEDS[mode] || TRANSPORT_SPEEDS.walking;
  const timeHours = distanceKm / speedKmh;
  return Math.round(timeHours * 3600); // Convert to seconds
};

// Automatically determine best transport mode based on distance
const determineTransportMode = (distanceKm: number): TransportMode => {
  // Long distances (> 500km) should use flight
  if (distanceKm > 500) {
    return 'flight';
  }
  // Medium distances (50-500km) - driving is practical
  else if (distanceKm > 50) {
    return 'driving';
  }
  // Short distances (10-50km) - driving or bicycling
  else if (distanceKm > 10) {
    return 'driving';
  }
  // Very short distances (<10km) - walking or bicycling could work, default to driving
  else {
    return 'driving';
  }
};

const createTransportSegment = (
  tripId: string,
  fromStop: Stop,
  toStop: Stop,
  mode?: TransportMode // Make mode optional to allow auto-detection
): Omit<TransportSegment, 'id' | 'createdAt' | 'updatedAt'> => {
  const distanceKm = LocationService.calculateDistance(
    { latitude: fromStop.lat, longitude: fromStop.lng },
    { latitude: toStop.lat, longitude: toStop.lng }
  );
  
  // If no mode specified, automatically determine based on distance
  const selectedMode = mode || determineTransportMode(distanceKm);
  const duration = estimateTransportTime(distanceKm, selectedMode);
  
  console.log(`Transport: ${fromStop.name} to ${toStop.name}`);
  console.log(`Distance: ${distanceKm.toFixed(1)}km, Mode: ${selectedMode}, Duration: ${duration}s (${Math.round(duration/60)}min)`);
  
  return {
    tripId,
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    mode: selectedMode,
    distance: Math.round(distanceKm * 1000), // Convert to meters
    duration: duration,
  };
};

const sanitizeStopData = (stopData: any): Omit<Stop, 'id' | 'tripId' | 'createdAt'> => {
  const safeString = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return value.toString();
    return fallback;
  };

  const safeNumber = (value: any, fallback: number): number => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  const validCategories: Stop['category'][] = [
    'food', 'activity', 'hotel', 'sightseeing', 'transport', 'other'
  ];
  const category = validCategories.includes(stopData.category) 
    ? stopData.category 
    : 'other';

  return {
    name: safeString(stopData.name, 'Unnamed Stop'),
    lat: safeNumber(stopData.lat, 0),
    lng: safeNumber(stopData.lng, 0),
    address: safeString(stopData.address, ''),
    order: safeNumber(stopData.order, 0),
    day: Math.max(1, safeNumber(stopData.day, 1)),
    notes: safeString(stopData.notes, ''),
    category: category,
    // Optional fields
    estimatedTime: stopData.estimatedTime 
      ? Math.max(0, safeNumber(stopData.estimatedTime, 0)) 
      : undefined,
    cost: stopData.cost 
      ? Math.max(0, safeNumber(stopData.cost, 0)) 
      : undefined,
    tags: stopData.tags && safeString(stopData.tags) ? safeString(stopData.tags) : undefined,
    website: stopData.website && safeString(stopData.website) ? safeString(stopData.website) : undefined,
    phone: stopData.phone && safeString(stopData.phone) ? safeString(stopData.phone) : undefined,
    companions: stopData.companions && safeString(stopData.companions) ? safeString(stopData.companions) : undefined,
  };
};

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  loading: boolean;
  error: string | null;
  tripListeners: Map<string, Unsubscribe>; // Track active listeners

  createTrip: (trip: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  loadUserTrips: () => Promise<void>;
  setCurrentTrip: (trip: Trip | null) => void;

  addStop: (tripId: string, stopData: any) => Promise<void>;
  updateStop: (stopId: string, updates: Partial<Stop>) => Promise<void>;
  deleteStop: (stopId: string) => Promise<void>;
  reorderStops: (tripId: string, stops: Stop[]) => Promise<void>;

  updateTransportMode: (tripId: string, fromStopId: string, toStopId: string, mode: TransportMode) => Promise<void>;
  generateTransportSegments: (tripId: string) => Promise<void>;
  regenerateAllTransportSegments: (tripId: string) => Promise<void>;
  getTransportSegment: (tripId: string, fromStopId: string, toStopId: string) => TransportSegment | null;

  setupTripListener: (tripId: string) => void;
  cleanupTripListener: (tripId: string) => void;
  cleanupAllListeners: () => void;

  clearError: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  currentTrip: null,
  loading: false,
  error: null,
  tripListeners: new Map(),

  createTrip: async (tripData) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated to create trips');

      const newTrip = {
        ...tripData,
        userId: user.uid,
        ownerId: user.uid,
        sharedWith: [],
        isCollaborative: false,
        stops: [],
        transportSegments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'trips'), newTrip);
      const createdTrip: Trip = { ...newTrip, id: docRef.id };

      set(state => ({ trips: [createdTrip, ...state.trips], loading: false }));
      return docRef.id;
    } catch (error: any) {
      console.error('Failed to create trip:', error);
      set({ error: `Failed to create trip: ${error.message}`, loading: false });
      throw error;
    }
  },

  updateTransportMode: async (tripId, fromStopId, toStopId, mode) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      const state = get();
      const trip = state.trips.find(t => t.id === tripId);
      if (!trip) throw new Error('Trip not found');

      const fromStop = trip.stops.find(s => s.id === fromStopId);
      const toStop = trip.stops.find(s => s.id === toStopId);
      if (!fromStop || !toStop) throw new Error('Stops not found');

      const existingSegment = trip.transportSegments.find(
        s => s.fromStopId === fromStopId && s.toStopId === toStopId
      );

      const segmentData = createTransportSegment(tripId, fromStop, toStop, mode);

      if (existingSegment) {
        const segmentRef = doc(db, 'transportSegments', existingSegment.id);
        await updateDoc(segmentRef, {
          ...segmentData,
          updatedAt: new Date().toISOString(),
        });

        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === tripId
              ? {
                  ...trip,
                  transportSegments: trip.transportSegments.map(segment =>
                    segment.id === existingSegment.id
                      ? { ...segment, ...segmentData, updatedAt: new Date().toISOString() }
                      : segment
                  ),
                }
              : trip
          ),
          currentTrip: state.currentTrip?.id === tripId
            ? {
                ...state.currentTrip,
                transportSegments: state.currentTrip.transportSegments.map(segment =>
                  segment.id === existingSegment.id
                    ? { ...segment, ...segmentData, updatedAt: new Date().toISOString() }
                    : segment
                ),
              }
            : state.currentTrip,
        }));
      } else {
        const newSegment = {
          ...segmentData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'transportSegments'), newSegment);
        const createdSegment: TransportSegment = { ...newSegment, id: docRef.id };

        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === tripId
              ? { ...trip, transportSegments: [...trip.transportSegments, createdSegment] }
              : trip
          ),
          currentTrip: state.currentTrip?.id === tripId
            ? { ...state.currentTrip, transportSegments: [...state.currentTrip.transportSegments, createdSegment] }
            : state.currentTrip,
        }));
      }
    } catch (error: any) {
      console.error('Failed to update transport mode:', error);
      set({ error: `Failed to update transport mode: ${error.message}` });
    }
  },

  generateTransportSegments: async (tripId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      const state = get();
      const trip = state.trips.find(t => t.id === tripId);
      if (!trip || trip.stops.length < 2) return;

      const sortedStops = [...trip.stops].sort((a, b) => a.order - b.order);
      const batch = writeBatch(db);
      const newSegments: TransportSegment[] = [];

      for (let i = 0; i < sortedStops.length - 1; i++) {
        const fromStop = sortedStops[i];
        const toStop = sortedStops[i + 1];

        const existingSegment = trip.transportSegments.find(
          s => s.fromStopId === fromStop.id && s.toStopId === toStop.id
        );

        if (!existingSegment) {
          const segmentData = createTransportSegment(tripId, fromStop, toStop);
          const newSegment = {
            ...segmentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const docRef = doc(collection(db, 'transportSegments'));
          batch.set(docRef, newSegment);
          newSegments.push({ ...newSegment, id: docRef.id });
        }
      }

      if (newSegments.length > 0) {
        await batch.commit();

        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === tripId
              ? { ...trip, transportSegments: [...trip.transportSegments, ...newSegments] }
              : trip
          ),
          currentTrip: state.currentTrip?.id === tripId
            ? { ...state.currentTrip, transportSegments: [...state.currentTrip.transportSegments, ...newSegments] }
            : state.currentTrip,
        }));
      }
    } catch (error: any) {
      console.error('Failed to generate transport segments:', error);
      set({ error: `Failed to generate transport segments: ${error.message}` });
    }
  },

  regenerateAllTransportSegments: async (tripId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      const state = get();
      const trip = state.trips.find(t => t.id === tripId);
      if (!trip) return;
      if (trip.stops.length < 2) return;

      const batch = writeBatch(db);
      const existingSegments = trip.transportSegments;
      
      existingSegments.forEach(segment => {
        const segmentRef = doc(db, 'transportSegments', segment.id);
        batch.delete(segmentRef);
      });

      const sortedStops = [...trip.stops].sort((a, b) => a.order - b.order);
      const newSegments: TransportSegment[] = [];

      for (let i = 0; i < sortedStops.length - 1; i++) {
        const fromStop = sortedStops[i];
        const toStop = sortedStops[i + 1];

        // Auto-detect mode based on distance (don't force driving)
        const segmentData = createTransportSegment(tripId, fromStop, toStop);
        const newSegment = {
          ...segmentData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = doc(collection(db, 'transportSegments'));
        batch.set(docRef, newSegment);
        newSegments.push({ ...newSegment, id: docRef.id });
      }

      await batch.commit();

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, transportSegments: newSegments }
            : trip
        ),
        currentTrip: state.currentTrip?.id === tripId
          ? { ...state.currentTrip, transportSegments: newSegments }
          : state.currentTrip,
      }));
    } catch (error: any) {
      console.error('Failed to regenerate transport segments:', error);
      set({ error: `Failed to regenerate transport segments: ${error.message}` });
    }
  },

  getTransportSegment: (tripId, fromStopId, toStopId) => {
    const state = get();
    const trip = state.trips.find(t => t.id === tripId) || state.currentTrip;
    if (!trip) return null;

    return trip.transportSegments.find(
      s => s.fromStopId === fromStopId && s.toStopId === toStopId
    ) || null;
  },

  updateTrip: async (tripId, updates) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      const updateData = { ...updates, updatedAt: new Date().toISOString() };
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, updateData);

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId ? { ...trip, ...updateData } : trip
        ),
        currentTrip: state.currentTrip?.id === tripId
          ? { ...state.currentTrip, ...updateData }
          : state.currentTrip,
        loading: false,
      }));
    } catch (error: any) {
      console.error('Failed to update trip:', error);
      set({ error: `Failed to update trip: ${error.message}`, loading: false });
    }
  },

  deleteTrip: async (tripId) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      const batch = writeBatch(db);
      const tripRef = doc(db, 'trips', tripId);
      batch.delete(tripRef);

      const stopsQuery = query(collection(db, 'stops'), where('tripId', '==', tripId));
      const stopsSnapshot = await getDocs(stopsQuery);
      stopsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      set(state => ({
        trips: state.trips.filter(trip => trip.id !== tripId),
        currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip,
        loading: false,
      }));
    } catch (error: any) {
      console.error('Failed to delete trip:', error);
      set({ error: `Failed to delete trip: ${error.message}`, loading: false });
    }
  },

  loadUserTrips: async () => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ loading: false });
        return;
      }

      const ownedTripsQuery = query(collection(db, 'trips'), where('userId', '==', user.uid));
      const ownedTripsSnapshot = await getDocs(ownedTripsQuery);
      
      const sharedTripsQuery = query(
        collection(db, 'trips'),
        where('sharedWith', 'array-contains', user.uid)
      );
      const sharedTripsSnapshot = await getDocs(sharedTripsQuery);
      
      const allTripDocs = [...ownedTripsSnapshot.docs, ...sharedTripsSnapshot.docs];
      const uniqueTripDocs = Array.from(new Map(allTripDocs.map(doc => [doc.id, doc])).values());
      const trips: Trip[] = [];

      for (const tripDoc of uniqueTripDocs) {
        const tripData = { id: tripDoc.id, ...tripDoc.data() } as Trip;

        const stopsQuery = query(collection(db, 'stops'), where('tripId', '==', tripDoc.id));
        const stopsSnapshot = await getDocs(stopsQuery);
        tripData.stops = stopsSnapshot.docs.map(stopDoc =>
          ({ id: stopDoc.id, ...stopDoc.data() } as Stop)
        );

        const segmentsQuery = query(collection(db, 'transportSegments'), where('tripId', '==', tripDoc.id));
        const segmentsSnapshot = await getDocs(segmentsQuery);
        tripData.transportSegments = segmentsSnapshot.docs.map(segmentDoc =>
          ({ id: segmentDoc.id, ...segmentDoc.data() } as TransportSegment)
        ) || [];

        trips.push(tripData);
      }

      trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      set({ trips, loading: false });
      
      // Set up real-time listeners for collaborative trips
      trips.forEach(trip => {
        if (trip.isCollaborative) {
          get().setupTripListener(trip.id);
        }
      });
    } catch (error: any) {
      console.error('Failed to load trips:', error);
      set({ error: `Failed to load trips: ${error.message}`, loading: false });
    }
  },

  setCurrentTrip: (trip) => set({ currentTrip: trip }),

  addStop: async (tripId, stopData) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');
      if (!tripId || typeof tripId !== 'string') throw new Error('Invalid trip ID');

      const sanitizedStopData = sanitizeStopData(stopData);
      if (!sanitizedStopData.name || sanitizedStopData.name === 'Unnamed Stop')
        throw new Error('Stop name is required');
      if (sanitizedStopData.lat === 0 || sanitizedStopData.lng === 0)
        throw new Error('Valid coordinates are required');

      // Remove undefined fields - Firebase doesn't accept them
      const cleanStopData: any = {
        tripId,
        createdAt: new Date().toISOString(),
      };

      // Copy all defined fields
      Object.keys(sanitizedStopData).forEach(key => {
        const value = (sanitizedStopData as any)[key];
        if (value !== undefined) {
          cleanStopData[key] = value;
        }
      });

      const docRef = await addDoc(collection(db, 'stops'), cleanStopData);
      const createdStop: Stop = { ...cleanStopData, id: docRef.id };

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, stops: [...trip.stops, createdStop].sort((a, b) => a.order - b.order) }
            : trip
        ),
        currentTrip: state.currentTrip?.id === tripId
          ? { ...state.currentTrip, stops: [...state.currentTrip.stops, createdStop].sort((a, b) => a.order - b.order) }
          : state.currentTrip,
        loading: false,
      }));

      await get().generateTransportSegments(tripId);
    } catch (error: any) {
      console.error('Failed to add stop:', error);
      set({ error: `Failed to add stop: ${error.message}`, loading: false });
      throw error;
    }
  },

  updateStop: async (stopId, updates) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      const sanitizedUpdates = sanitizeStopData({ ...updates });
      
      // Remove undefined fields - Firebase doesn't accept them
      const cleanUpdates: any = {};
      Object.keys(sanitizedUpdates).forEach(key => {
        const value = (sanitizedUpdates as any)[key];
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      });

      const stopRef = doc(db, 'stops', stopId);
      await updateDoc(stopRef, cleanUpdates);

      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          stops: trip.stops.map(stop =>
            stop.id === stopId ? { ...stop, ...cleanUpdates } : stop
          )
        })),
        currentTrip: state.currentTrip
          ? {
              ...state.currentTrip,
              stops: state.currentTrip.stops.map(stop =>
                stop.id === stopId ? { ...stop, ...cleanUpdates } : stop
              )
            }
          : null,
      }));
    } catch (error: any) {
      console.error('Failed to update stop:', error);
      set({ error: `Failed to update stop: ${error.message}` });
    }
  },

  deleteStop: async (stopId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      await deleteDoc(doc(db, 'stops', stopId));

      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          stops: trip.stops.filter(stop => stop.id !== stopId)
        })),
        currentTrip: state.currentTrip
          ? { ...state.currentTrip, stops: state.currentTrip.stops.filter(stop => stop.id !== stopId) }
          : null,
      }));
    } catch (error: any) {
      console.error('Failed to delete stop:', error);
      set({ error: `Failed to delete stop: ${error.message}` });
    }
  },

  reorderStops: async (tripId, reorderedStops) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User must be authenticated');

      console.log('reorderStops called with:', {
        tripId,
        stopCount: reorderedStops.length,
        updates: reorderedStops.map(s => `${s.name}: order=${s.order}, day=${s.day}`)
      });

      const batch = writeBatch(db);
      reorderedStops.forEach((stop) => {
        const stopRef = doc(db, 'stops', stop.id);
        const updateData = { 
          order: stop.order,
          day: stop.day 
        };
        console.log(`Updating ${stop.name}:`, updateData);
        batch.update(stopRef, updateData);
      });
      await batch.commit();

      console.log('Firebase batch commit successful - all days updated');

      // Create completely new stop objects to ensure React detects the change
      const sortedStops = [...reorderedStops]
        .sort((a, b) => a.order - b.order)
        .map(stop => ({ ...stop })); // Create new objects
      
      console.log('Sorted stops:', sortedStops.map(s => `${s.name} (order: ${s.order}, day: ${s.day})`));

      set(state => {
        // Create completely new trips array with new trip object
        const updatedTrips = state.trips.map(trip =>
          trip.id === tripId 
            ? { ...trip, stops: sortedStops, updatedAt: new Date().toISOString() } 
            : trip
        );
        
        const updatedCurrentTrip = state.currentTrip?.id === tripId
          ? { ...state.currentTrip, stops: sortedStops, updatedAt: new Date().toISOString() }
          : state.currentTrip;
        
        console.log('State updated:', {
          tripsCount: updatedTrips.length,
          currentTripStops: updatedCurrentTrip?.stops.length,
          updatedTripId: tripId
        });
        
        return {
          trips: updatedTrips,
          currentTrip: updatedCurrentTrip,
        };
      });
      
      console.log('reorderStops complete');
    } catch (error: any) {
      console.error('Failed to reorder stops:', error);
      set({ error: `Failed to reorder stops: ${error.message}` });
    }
  },

  setupTripListener: (tripId) => {
    const state = get();
    
    if (state.tripListeners.has(tripId)) {
      return;
    }

    const tripRef = doc(db, 'trips', tripId);
    const unsubscribe = onSnapshot(tripRef, async (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const updatedTripData = { id: snapshot.id, ...snapshot.data() } as Trip;

      const stopsQuery = query(collection(db, 'stops'), where('tripId', '==', tripId));
      const stopsSnapshot = await getDocs(stopsQuery);
      updatedTripData.stops = stopsSnapshot.docs.map(stopDoc =>
        ({ id: stopDoc.id, ...stopDoc.data() } as Stop)
      );

      const segmentsQuery = query(collection(db, 'transportSegments'), where('tripId', '==', tripId));
      const segmentsSnapshot = await getDocs(segmentsQuery);
      updatedTripData.transportSegments = segmentsSnapshot.docs.map(segmentDoc =>
        ({ id: segmentDoc.id, ...segmentDoc.data() } as TransportSegment)
      ) || [];

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId ? updatedTripData : trip
        ),
        currentTrip: state.currentTrip?.id === tripId
          ? updatedTripData
          : state.currentTrip,
      }));
    }, (error) => {
      console.error(`Error in trip listener for ${tripId}:`, error);
    });

    state.tripListeners.set(tripId, unsubscribe);
  },

  cleanupTripListener: (tripId) => {
    const state = get();
    const unsubscribe = state.tripListeners.get(tripId);
    
    if (unsubscribe) {
      unsubscribe();
      state.tripListeners.delete(tripId);
    }
  },

  cleanupAllListeners: () => {
    const state = get();
    
    state.tripListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    
    state.tripListeners.clear();
  },

  clearError: () => set({ error: null }),
}));
