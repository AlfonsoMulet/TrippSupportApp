import { create } from 'zustand';

// Mapbox API configuration
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

// Calculate distance between two points using Haversine formula
export type TransportMode = 'walking' | 'driving' | 'bicycling' | 'flight';

export interface RouteRequest {
  id: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: TransportMode;
  realistic?: boolean; // Whether to use Mapbox routing or simple straight lines
}

export interface RouteResult {
  requestId: string;
  mode: TransportMode;
  distance: number; // in kilometers
  duration: number; // in minutes
  coordinates: { latitude: number; longitude: number }[];
}

interface RouteState {
  loadingRoutes: Set<string>;
  routeCache: Map<string, RouteResult>;

  requestRoute: (request: RouteRequest) => Promise<RouteResult | null>;
  clearCache: () => void;
}

// Map transport modes to Mapbox routing profiles
const getMapboxProfile = (mode: TransportMode): string => {
  switch (mode) {
    case 'driving':
      return 'driving';
    case 'walking':
      return 'walking';
    case 'bicycling':
      return 'cycling';
    case 'flight':
      return 'driving'; // Fallback to driving for flights (straight line will be used instead)
    default:
      return 'driving';
  }
};

// Fetch realistic route from Mapbox
const fetchMapboxRoute = async (request: RouteRequest): Promise<RouteResult | null> => {
  if (request.mode === 'flight') {
    // For flights, always use straight line
    return calculateSimpleRoute(request);
  }

  try {
    const profile = getMapboxProfile(request.mode);
    const coordinates = `${request.origin.lng},${request.origin.lat};${request.destination.lng},${request.destination.lat}`;
    
    const url = `${MAPBOX_DIRECTIONS_URL}/${profile}/${coordinates}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const geometry = route.geometry.coordinates;
      
      // Convert Mapbox coordinates [lng, lat] to React Native Maps format [{latitude, longitude}]
      const coordinates_formatted = geometry.map(([lng, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      }));
      
      return {
        requestId: request.id,
        mode: request.mode,
        distance: route.distance / 1000, // Convert meters to kilometers
        duration: route.duration / 60,   // Convert seconds to minutes
        coordinates: coordinates_formatted,
      };
    } else {
      // Fallback to simple route if Mapbox fails
      return calculateSimpleRoute(request);
    }
  } catch (error) {
    console.error('Mapbox routing error:', error);
    // Fallback to simple route
    return calculateSimpleRoute(request);
  }
};
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simple route calculation (straight line)
const calculateSimpleRoute = async (request: RouteRequest): Promise<RouteResult> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

  const distance = calculateDistance(
    request.origin.lat,
    request.origin.lng,
    request.destination.lat,
    request.destination.lng
  );

  // Estimate travel time based on mode
  let duration = 0;
  switch (request.mode) {
    case 'walking':
      duration = Math.round((distance / 5) * 60); // 5 km/h walking speed
      break;
    case 'driving':
      duration = Math.round((distance / 50) * 60); // 50 km/h average
      break;
    case 'bicycling':
      duration = Math.round((distance / 15) * 60); // 15 km/h cycling speed
      break;
    case 'flight':
      duration = Math.round((distance / 800) * 60); // 800 km/h flight speed
      break;
  }

  return {
    requestId: request.id,
    mode: request.mode,
    distance,
    duration,
    coordinates: [
      { latitude: request.origin.lat, longitude: request.origin.lng },
      { latitude: request.destination.lat, longitude: request.destination.lng },
    ],
  };
};

export const useRouteStore = create<RouteState>((set, get) => ({
  loadingRoutes: new Set(),
  routeCache: new Map(),

  requestRoute: async (request: RouteRequest): Promise<RouteResult | null> => {
    const { loadingRoutes, routeCache } = get();

    // Create cache key (include realistic flag)
    const cacheKey = `${request.origin.lat},${request.origin.lng}-${request.destination.lat},${request.destination.lng}-${request.mode}-${request.realistic || false}`;
    
    // Check cache first
    const cached = routeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Prevent duplicate requests
    if (loadingRoutes.has(request.id)) {
      return null;
    }

    // Add to loading
    const newLoadingRoutes = new Set(loadingRoutes);
    newLoadingRoutes.add(request.id);
    set({ loadingRoutes: newLoadingRoutes });

    try {
      // Use Mapbox routing if realistic flag is true, otherwise use simple routing
      const result = request.realistic 
        ? await fetchMapboxRoute(request)
        : await calculateSimpleRoute(request);

      if (!result) {
        // Remove from loading if result is null
        const finalLoadingRoutes = new Set(get().loadingRoutes);
        finalLoadingRoutes.delete(request.id);
        set({ loadingRoutes: finalLoadingRoutes });
        return null;
      }

      // Update cache
      const newCache = new Map(get().routeCache);
      newCache.set(cacheKey, result);

      // Remove from loading
      const finalLoadingRoutes = new Set(get().loadingRoutes);
      finalLoadingRoutes.delete(request.id);

      set({
        loadingRoutes: finalLoadingRoutes,
        routeCache: newCache,
      });

      return result;
    } catch (error) {
      // Remove from loading on error
      const finalLoadingRoutes = new Set(get().loadingRoutes);
      finalLoadingRoutes.delete(request.id);
      set({ loadingRoutes: finalLoadingRoutes });

      console.error('Route calculation failed:', error);
      return null;
    }
  },

  clearCache: () => {
    set({ routeCache: new Map() });
  },
}));

// For backwards compatibility
export const useSimpleRouteStore = useRouteStore;
export type SimpleTransportMode = TransportMode;
export type SimpleRouteRequest = RouteRequest;
export type SimpleRouteResult = RouteResult;
