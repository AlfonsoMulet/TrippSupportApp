// LocationService - Simplified for frontend-only app
import * as Location from 'expo-location';

export interface SimpleCoordinates {
  latitude: number;
  longitude: number;
}

export class LocationService {
  static async getCurrentLocation(): Promise<SimpleCoordinates | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  static calculateDistance(
    point1: SimpleCoordinates,
    point2: SimpleCoordinates
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * 
      Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  static estimateTravelTime(distanceKm: number, mode: 'walking' | 'driving' | 'transit'): number {
    // Simple time estimation in minutes
    const speeds = {
      walking: 5,   // 5 km/h
      driving: 50,  // 50 km/h average in city
      transit: 30,  // 30 km/h with stops
    };

    const speed = speeds[mode] || speeds.walking;
    return Math.round((distanceKm / speed) * 60); // Convert to minutes
  }
}
