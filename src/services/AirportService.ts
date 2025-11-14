/**
 * Airport Service
 * Handles airport-related operations including finding nearest airports
 * and creating complex flight routes with car transfers
 */

import { MAJOR_AIRPORTS, Airport } from '../data/airports';
import { LocationService } from './LocationService';

export interface ComplexFlightRoute {
  segments: Array<{
    type: 'car' | 'flight';
    from: {
      name: string;
      lat: number;
      lng: number;
      isAirport?: boolean;
      airportCode?: string;
    };
    to: {
      name: string;
      lat: number;
      lng: number;
      isAirport?: boolean;
      airportCode?: string;
    };
    distance: number; // in meters
    duration: number; // in seconds
    needsRealisticRoute?: boolean; // Flag for car segments
  }>;
  totalDistance: number;
  totalDuration: number;
}

export class AirportService {
  /**
   * Find the closest airport to a given location
   */
  static findClosestAirport(lat: number, lng: number): Airport {
    let closestAirport = MAJOR_AIRPORTS[0];
    let minDistance = LocationService.calculateDistance(
      { latitude: lat, longitude: lng },
      { latitude: closestAirport.lat, longitude: closestAirport.lng }
    );

    for (const airport of MAJOR_AIRPORTS) {
      const distance = LocationService.calculateDistance(
        { latitude: lat, longitude: lng },
        { latitude: airport.lat, longitude: airport.lng }
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestAirport = airport;
      }
    }

    return closestAirport;
  }

  /**
   * Calculate transport time based on mode and distance
   */
  private static calculateTransportTime(distanceKm: number, mode: 'car' | 'flight'): number {
    const speeds = {
      car: 50,    // 50 km/h average
      flight: 800, // 800 km/h cruise speed
    };
    const timeHours = distanceKm / speeds[mode];
    return Math.round(timeHours * 3600); // Convert to seconds
  }

  /**
   * Create a complex flight route with airport transfers
   * This includes: Origin -> Departure Airport (car) -> Arrival Airport (flight) -> Destination (car)
   */
  static createComplexFlightRoute(
    fromStop: { name: string; lat: number; lng: number },
    toStop: { name: string; lat: number; lng: number }
  ): ComplexFlightRoute {
    // Find closest airports
    const departureAirport = this.findClosestAirport(fromStop.lat, fromStop.lng);
    const arrivalAirport = this.findClosestAirport(toStop.lat, toStop.lng);

    console.log('Complex Flight Route:');
    console.log(`${fromStop.name} -> ${departureAirport.name} (${departureAirport.code})`);
    console.log(`${departureAirport.code} -> ${arrivalAirport.code}`);
    console.log(`${arrivalAirport.name} (${arrivalAirport.code}) -> ${toStop.name}`);

    const segments: ComplexFlightRoute['segments'] = [];

    // Segment 1: Origin to Departure Airport (Car)
    const segment1Distance = LocationService.calculateDistance(
      { latitude: fromStop.lat, longitude: fromStop.lng },
      { latitude: departureAirport.lat, longitude: departureAirport.lng }
    );
    const segment1Duration = this.calculateTransportTime(segment1Distance, 'car');
    
    segments.push({
      type: 'car',
      from: {
        name: fromStop.name,
        lat: fromStop.lat,
        lng: fromStop.lng,
      },
      to: {
        name: departureAirport.name,
        lat: departureAirport.lat,
        lng: departureAirport.lng,
        isAirport: true,
        airportCode: departureAirport.code,
      },
      distance: Math.round(segment1Distance * 1000), // Convert to meters
      duration: segment1Duration,
      needsRealisticRoute: true,
    });

    // Segment 2: Departure Airport to Arrival Airport (Flight)
    const segment2Distance = LocationService.calculateDistance(
      { latitude: departureAirport.lat, longitude: departureAirport.lng },
      { latitude: arrivalAirport.lat, longitude: arrivalAirport.lng }
    );
    const segment2Duration = this.calculateTransportTime(segment2Distance, 'flight');
    
    segments.push({
      type: 'flight',
      from: {
        name: departureAirport.name,
        lat: departureAirport.lat,
        lng: departureAirport.lng,
        isAirport: true,
        airportCode: departureAirport.code,
      },
      to: {
        name: arrivalAirport.name,
        lat: arrivalAirport.lat,
        lng: arrivalAirport.lng,
        isAirport: true,
        airportCode: arrivalAirport.code,
      },
      distance: Math.round(segment2Distance * 1000), // Convert to meters
      duration: segment2Duration,
    });

    // Segment 3: Arrival Airport to Destination (Car)
    const segment3Distance = LocationService.calculateDistance(
      { latitude: arrivalAirport.lat, longitude: arrivalAirport.lng },
      { latitude: toStop.lat, longitude: toStop.lng }
    );
    const segment3Duration = this.calculateTransportTime(segment3Distance, 'car');
    
    segments.push({
      type: 'car',
      from: {
        name: arrivalAirport.name,
        lat: arrivalAirport.lat,
        lng: arrivalAirport.lng,
        isAirport: true,
        airportCode: arrivalAirport.code,
      },
      to: {
        name: toStop.name,
        lat: toStop.lat,
        lng: toStop.lng,
      },
      distance: Math.round(segment3Distance * 1000), // Convert to meters
      duration: segment3Duration,
      needsRealisticRoute: true,
    });

    const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

    console.log(`Total Distance: ${(totalDistance / 1000).toFixed(1)}km`);
    console.log(`Total Duration: ${Math.round(totalDuration / 60)}min`);

    return {
      segments,
      totalDistance,
      totalDuration,
    };
  }

  /**
   * Generate curved path coordinates for flight visualization
   * This creates a great circle arc with reduced curvature
   */
  static generateFlightCurvePath(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    numPoints: number = 30,
    curveFactor: number = 0.3 // 0.3 = subtle curve, 1.0 = full great circle
  ): Array<{ latitude: number; longitude: number }> {
    const coordinates: Array<{ latitude: number; longitude: number }> = [];

    // Convert to radians
    const lat1 = (fromLat * Math.PI) / 180;
    const lon1 = (fromLng * Math.PI) / 180;
    const lat2 = (toLat * Math.PI) / 180;
    const lon2 = (toLng * Math.PI) / 180;

    // Calculate great circle distance
    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
    );

    for (let i = 0; i <= numPoints; i++) {
      const f = i / numPoints;

      // Apply curve factor to reduce arc height
      const curvedF = f + (Math.sin(f * Math.PI) * curveFactor * 0.1);
      const adjustedF = Math.min(Math.max(curvedF, 0), 1);

      // Interpolate along great circle with reduced curvature
      const A = Math.sin((1 - adjustedF) * d) / Math.sin(d);
      const B = Math.sin(adjustedF * d) / Math.sin(d);

      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);

      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      const lon = Math.atan2(y, x);

      coordinates.push({
        latitude: (lat * 180) / Math.PI,
        longitude: (lon * 180) / Math.PI,
      });
    }

    return coordinates;
  }
}
