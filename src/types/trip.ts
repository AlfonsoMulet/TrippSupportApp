export interface Stop {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  category: 'food' | 'activity' | 'hotel' | 'sightseeing' | 'transport' | 'other';
  plannedArrival?: string;
  plannedDeparture?: string;
  budget?: number;
  notes?: string;
  completed: boolean;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  stops: Stop[];
  createdAt: string;
  updatedAt: string;
  sharedWith?: string[]; // Array of user IDs who have access
  isCollaborative?: boolean; // Whether trip is shared with others
}
