/**
 * Transport Optimizer
 * Intelligently determines the best transport mode based on distance and time
 */

import { TransportMode } from '../store/tripStore';

interface TransportRecommendation {
  mode: TransportMode;
  reason: string;
  confidence: number; // 0-1
}

interface DistanceTimeData {
  distanceKm: number;
  estimatedMinutes?: number;
}

/**
 * Calculates distance between two coordinates in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates travel time based on distance and transport mode
 */
export function estimateTravelTime(distanceKm: number, mode: TransportMode): number {
  // Average speeds in km/h
  const speeds: Record<TransportMode, number> = {
    walking: 5,
    bicycling: 20,
    driving: 50,
    flight: 500,
  };

  const hours = distanceKm / speeds[mode];
  return Math.round(hours * 60); // Return minutes
}

/**
 * Determines the optimal transport mode based on distance
 * 
 * Rules:
 * - 0-1 km: Walking (pedestrian-friendly, no parking needed)
 * - 1-5 km: Bicycling or Walking (short distance, good for sightseeing)
 * - 5-30 km: Driving or Transit (reasonable driving distance)
 * - 30-300 km: Driving (inter-city, road trip)
 * - 300+ km: Flight (long distance, air travel more efficient)
 */
export function determineOptimalTransport(data: DistanceTimeData): TransportRecommendation {
  const { distanceKm } = data;

  // Very short distance (0-1 km)
  if (distanceKm < 1) {
    return {
      mode: 'walking',
      reason: 'Very short distance, perfect for walking',
      confidence: 0.95,
    };
  }

  // Short distance (1-3 km)
  if (distanceKm < 3) {
    return {
      mode: 'bicycling',
      reason: 'Short distance, ideal for cycling',
      confidence: 0.85,
    };
  }

  // Medium-short distance (3-5 km)
  if (distanceKm < 5) {
    return {
      mode: 'bicycling',
      reason: 'Moderate distance, cycling or walking recommended',
      confidence: 0.75,
    };
  }

  // Medium distance (5-15 km)
  if (distanceKm < 15) {
    return {
      mode: 'driving',
      reason: 'Medium distance, driving or transit recommended',
      confidence: 0.80,
    };
  }

  // Medium-long distance (15-30 km)
  if (distanceKm < 30) {
    return {
      mode: 'driving',
      reason: 'Considerable distance, driving recommended',
      confidence: 0.85,
    };
  }

  // Long distance (30-300 km)
  if (distanceKm < 300) {
    return {
      mode: 'driving',
      reason: 'Long distance, road trip suitable',
      confidence: 0.90,
    };
  }

  // Very long distance (300-1000 km)
  if (distanceKm < 1000) {
    return {
      mode: 'flight',
      reason: 'Very long distance, consider flying',
      confidence: 0.85,
    };
  }

  // Extremely long distance (1000+ km)
  return {
    mode: 'flight',
    reason: 'Extremely long distance, flying strongly recommended',
    confidence: 0.95,
  };
}

/**
 * Gets transport mode display properties
 */
export function getTransportModeInfo(mode: TransportMode): {
  label: string;
  icon: string;
  color: string;
  description: string;
} {
  const modeInfo: Record<TransportMode, {
    label: string;
    icon: string;
    color: string;
    description: string;
  }> = {
    walking: {
      label: 'Walking',
      icon: 'walk',
      color: '#10b981',
      description: 'On foot',
    },
    bicycling: {
      label: 'Cycling',
      icon: 'bicycle',
      color: '#8b5cf6',
      description: 'Bicycle or bike-share',
    },
    driving: {
      label: 'Driving',
      icon: 'car',
      color: '#2563eb',
      description: 'Car, taxi, or ride-share',
    },

    flight: {
      label: 'Flight',
      icon: 'airplane',
      color: '#ef4444',
      description: 'Airplane (for long distances)',
    },
  };

  return modeInfo[mode];
}

/**
 * Formats distance for display
 */
export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters < 0) return '--';
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

/**
 * Formats duration for display
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--';
  const minutes = Math.round(seconds / 60);
  
  if (minutes === 0) return '< 1min';
  if (minutes < 60) return `${minutes}min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Validates if transport mode is reasonable for the distance
 */
export function isTransportModeReasonable(
  mode: TransportMode,
  distanceKm: number
): { reasonable: boolean; warning?: string } {
  if (mode === 'walking' && distanceKm > 10) {
    return {
      reasonable: false,
      warning: `${distanceKm.toFixed(1)}km is quite far to walk (${estimateTravelTime(distanceKm, 'walking')} min)`,
    };
  }

  if (mode === 'bicycling' && distanceKm > 50) {
    return {
      reasonable: false,
      warning: `${distanceKm.toFixed(1)}km is a very long bike ride (${estimateTravelTime(distanceKm, 'bicycling')} min)`,
    };
  }

  if (mode === 'flight' && distanceKm < 100) {
    return {
      reasonable: false,
      warning: `${distanceKm.toFixed(1)}km is too short for a flight - consider driving`,
    };
  }

  return { reasonable: true };
}
