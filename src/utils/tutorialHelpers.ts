import { Trip, Stop } from '../store/tripStore';

/**
 * Creates a mock tutorial trip with 2 sample stops
 * This trip is used to demonstrate app features during the tutorial
 */
export const createTutorialTrip = (): Omit<Trip, 'userId' | 'id'> => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Stop 1: Eiffel Tower, Paris
  const stop1: Omit<Stop, 'id' | 'tripId' | 'createdAt'> = {
    name: 'Eiffel Tower',
    lat: 48.8584,
    lng: 2.2945,
    day: 1,
    order: 0,
    notes: 'Don\'t forget to take photos!',
    category: 'sightseeing',
    address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
  };

  // Stop 2: Louvre Museum, Paris
  const stop2: Omit<Stop, 'id' | 'tripId' | 'createdAt'> = {
    name: 'Louvre Museum',
    lat: 48.8606,
    lng: 2.3376,
    day: 1,
    order: 1,
    notes: 'See the Mona Lisa!',
    category: 'sightseeing',
    address: 'Rue de Rivoli, 75001 Paris, France',
  };

  const tutorialTrip: Omit<Trip, 'userId' | 'id'> = {
    name: '🎓 Tutorial: Paris Adventure',
    description: 'Sample trip to explore the app features',
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: dayAfter.toISOString().split('T')[0],
    budget: 500,
    ownerId: '', // Will be set by createTrip
    sharedWith: [],
    isCollaborative: false,
    members: [],
    stops: [], // Stops will be added separately
    transportSegments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return tutorialTrip;
};

/**
 * Check if a trip is a tutorial trip by its ID (stored in tutorial store)
 */
export const isTutorialTrip = (tripId: string): boolean => {
  // This will be checked against tutorialTripId in the store
  // This function is kept for backwards compatibility
  return false;
};

/**
 * Check if a trip is a tutorial trip by checking its name
 */
export const isTutorialTripByName = (tripName: string): boolean => {
  return tripName.includes('🎓 Tutorial:');
};

/**
 * Check if a trip object is a tutorial trip
 */
export const isTutorialTripObject = (trip: Trip): boolean => {
  return isTutorialTripByName(trip.name);
};
