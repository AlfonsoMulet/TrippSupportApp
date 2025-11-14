import { Stop } from '../store/tripStore';

export type TransportMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export interface RouteSegment {
  coordinates: { latitude: number; longitude: number }[];
  mode: TransportMode;
  color: string;
  strokePattern?: number[];
  distance?: number;
  duration?: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Intelligent transport mode detection based on stop characteristics
 */
export const determineTransportMode = (origin: Stop, destination: Stop): TransportMode => {
  const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  
  // Transport hubs suggest public transport
  if (origin.category === 'transport' || destination.category === 'transport') {
    return 'transit';
  }
  
  // Hotels to activities often involve driving
  if ((origin.category === 'hotel' && destination.category === 'activity') ||
      (origin.category === 'activity' && destination.category === 'hotel')) {
    return distance > 2 ? 'driving' : 'walking';
  }
  
  // Food venues in city centers are often walkable
  if (origin.category === 'food' || destination.category === 'food') {
    return distance < 1 ? 'walking' : (distance < 5 ? 'driving' : 'transit');
  }
  
  // Distance-based fallback
  if (distance < 0.5) return 'walking';
  if (distance < 2) return 'bicycling';
  if (distance < 20) return 'driving';
  return 'transit';
};

/**
 * Get route color based on transport mode
 */
export const getRouteColor = (mode: TransportMode): string => {
  const colors = {
    driving: '#2563eb',      // Blue
    walking: '#10b981',      // Green
    transit: '#f59e0b',      // Orange
    bicycling: '#8b5cf6',    // Purple
  };
  return colors[mode];
};

/**
 * Get stroke pattern for different transport modes
 */
export const getStrokePattern = (mode: TransportMode): number[] | undefined => {
  const patterns = {
    driving: undefined,       // Solid line
    walking: [5, 5],         // Dashed
    transit: [10, 5, 2, 5],  // Dash-dot
    bicycling: [3, 3],       // Short dashes
  };
  return patterns[mode];
};

/**
 * Day-based color scheme generator
 */
export const getDayColors = (): string[] => [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

/**
 * Category-based color scheme
 */
export const getCategoryColors = (): Record<Stop['category'], string> => ({
  food: '#f59e0b',
  activity: '#10b981',
  hotel: '#8b5cf6',
  sightseeing: '#ef4444',
  transport: '#3b82f6',
  other: '#6b7280',
});

/**
 * Category icons mapping
 */
export const getCategoryIcons = (): Record<Stop['category'], string> => ({
  food: 'restaurant',
  activity: 'play',
  hotel: 'bed',
  sightseeing: 'camera',
  transport: 'car',
  other: 'ellipse',
});

/**
 * Decode Google Maps polyline
 */
export const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

/**
 * Get directions from Google Directions API
 */
export const getDirectionsRoute = async (
  origin: Stop,
  destination: Stop,
  mode: TransportMode,
  apiKey: string
): Promise<{ coordinates: { latitude: number; longitude: number }[]; distance?: number; duration?: number } | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.lat},${origin.lng}&` +
      `destination=${destination.lat},${destination.lng}&` +
      `mode=${mode}&` +
      `key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        coordinates: decodePolyline(route.overview_polyline.points),
        distance: leg.distance?.value, // in meters
        duration: leg.duration?.value, // in seconds
      };
    }
    
    return null;
  } catch (error) {
    console.error('Directions API error:', error);
    return null;
  }
};

/**
 * Generate fallback route (straight line) when API fails
 */
export const generateFallbackRoute = (origin: Stop, destination: Stop): RouteSegment => {
  return {
    coordinates: [
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.lat, longitude: destination.lng }
    ],
    mode: 'driving',
    color: '#6b7280',
    strokePattern: [5, 5], // Dashed line to indicate it's a fallback
  };
};

/**
 * Optimize stop order for better routing (simple greedy algorithm)
 */
export const optimizeStopOrder = (stops: Stop[], startLocation?: { lat: number; lng: number }): Stop[] => {
  if (stops.length <= 2) return stops;
  
  const optimized: Stop[] = [];
  const remaining = [...stops];
  
  // Start from the first stop or provided location
  let currentLocation = startLocation || { lat: stops[0].lat, lng: stops[0].lng };
  
  // If we have a start location, find the nearest stop first
  if (startLocation) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remaining.forEach((stop, index) => {
      const distance = calculateDistance(currentLocation.lat, currentLocation.lng, stop.lat, stop.lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    
    optimized.push(remaining.splice(nearestIndex, 1)[0]);
    currentLocation = { lat: optimized[0].lat, lng: optimized[0].lng };
  } else {
    // Start with the first stop
    optimized.push(remaining.shift()!);
    currentLocation = { lat: optimized[0].lat, lng: optimized[0].lng };
  }
  
  // Greedy algorithm: always go to the nearest unvisited stop
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remaining.forEach((stop, index) => {
      const distance = calculateDistance(currentLocation.lat, currentLocation.lng, stop.lat, stop.lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    
    const nextStop = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nextStop);
    currentLocation = { lat: nextStop.lat, lng: nextStop.lng };
  }
  
  // Update order property
  return optimized.map((stop, index) => ({ ...stop, order: index }));
};

/**
 * Calculate total trip distance and estimated time
 */
export const calculateTripMetrics = (
  stops: Stop[],
  routes: RouteSegment[]
): { totalDistance: number; totalTime: number } => {
  let totalDistance = 0;
  let totalTime = 0;
  
  routes.forEach(route => {
    if (route.distance) totalDistance += route.distance;
    if (route.duration) totalTime += route.duration;
  });
  
  // Add estimated time at each stop
  stops.forEach(stop => {
    if (stop.estimatedTime) totalTime += stop.estimatedTime * 60; // Convert minutes to seconds
  });
  
  return {
    totalDistance: totalDistance / 1000, // Convert to km
    totalTime: totalTime / 3600, // Convert to hours
  };
};

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Format duration for display
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};