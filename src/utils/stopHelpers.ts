import { Stop } from '../store/tripStore';

/**
 * Sort stops by day, then by order within each day
 */
export const sortStops = (stops: Stop[]): Stop[] => {
  return [...stops].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.order - b.order;
  });
};

/**
 * Group stops by day number
 * Returns an object with day numbers as keys and arrays of stops as values
 */
export const groupStopsByDay = (stops: Stop[]): { [key: number]: Stop[] } => {
  const sorted = sortStops(stops);
  const grouped: { [key: number]: Stop[] } = {};
  
  sorted.forEach(stop => {
    if (!grouped[stop.day]) {
      grouped[stop.day] = [];
    }
    grouped[stop.day].push(stop);
  });
  
  return grouped;
};

/**
 * Get all unique days from a list of stops, sorted
 */
export const getUniqueDays = (stops: Stop[]): number[] => {
  const days = new Set(stops.map(stop => stop.day));
  return Array.from(days).sort((a, b) => a - b);
};

/**
 * Get stops for a specific day, sorted by order
 */
export const getStopsForDay = (stops: Stop[], day: number): Stop[] => {
  return stops
    .filter(stop => stop.day === day)
    .sort((a, b) => a.order - b.order);
};

/**
 * Reorder stops within a day
 */
export const reorderStops = (stops: Stop[], fromIndex: number, toIndex: number, day: number): Stop[] => {
  const dayStops = getStopsForDay(stops, day);
  const otherStops = stops.filter(stop => stop.day !== day);
  
  const [movedStop] = dayStops.splice(fromIndex, 1);
  dayStops.splice(toIndex, 0, movedStop);
  
  // Update order values
  const updatedDayStops = dayStops.map((stop, index) => ({
    ...stop,
    order: index,
  }));
  
  return [...otherStops, ...updatedDayStops];
};
