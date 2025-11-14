import { Trip } from '../store/tripStore';

/**
 * Encode trip data into a shareable string
 * @param trip The trip to encode
 * @returns Base64 encoded string containing trip data
 */
export function encodeTripData(trip: Trip): string {
  try {
    // Create a simplified version of the trip data
    const tripData = {
      name: trip.name,
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate,
      stops: trip.stops,
      transportSegments: trip.transportSegments,
      budget: trip.budget,
    };

    // Convert to JSON and then to base64
    const jsonString = JSON.stringify(tripData);
    const base64String = btoa(unescape(encodeURIComponent(jsonString)));

    // Add a prefix to identify it as a Tripp share code
    return `TRIPP:${base64String}`;
  } catch (error) {
    console.error('Failed to encode trip data:', error);
    throw new Error('Failed to generate share code');
  }
}

/**
 * Decode a trip share string back into trip data
 * @param shareCode The encoded share string
 * @returns Decoded trip data (without IDs, userId, etc.)
 */
export function decodeTripData(shareCode: string): Partial<Trip> | null {
  try {
    // Check if it has the TRIPP: prefix
    if (!shareCode.startsWith('TRIPP:')) {
      throw new Error('Invalid share code format');
    }

    // Remove the prefix
    const base64String = shareCode.substring(6);

    // Decode from base64 to JSON
    const jsonString = decodeURIComponent(escape(atob(base64String)));
    const tripData = JSON.parse(jsonString);

    // Validate the data has required fields
    if (!tripData.name) {
      throw new Error('Invalid trip data - missing name');
    }

    // Ensure stops is an array (can be empty)
    if (!tripData.stops) {
      tripData.stops = [];
    }

    if (!Array.isArray(tripData.stops)) {
      throw new Error('Invalid trip data - stops must be an array');
    }

    return tripData;
  } catch (error) {
    console.error('Failed to decode trip data:', error);
    return null;
  }
}

/**
 * Validate if a string is a valid trip share code
 * @param shareCode The string to validate
 * @returns true if valid, false otherwise
 */
export function isValidShareCode(shareCode: string): boolean {
  if (!shareCode.startsWith('TRIPP:')) {
    return false;
  }

  try {
    const decoded = decodeTripData(shareCode);
    return decoded !== null;
  } catch {
    return false;
  }
}
