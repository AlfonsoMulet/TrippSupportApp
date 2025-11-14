// Enhanced routing types for comprehensive routing system
// Following the specification requirements for real-world routing

export type TransportMode = 'driving' | 'walking' | 'bicycling' | 'transit' | 'flight';

export type RouteProvider = 'google' | 'mapbox' | 'here' | 'fallback';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteWaypoint extends Coordinates {
  name?: string;
  address?: string;
}

// Route leg represents a single mode segment
export interface RouteLeg {
  id: string;
  mode: TransportMode;
  steps: RouteStep[];
  distance: number; // meters
  duration: number; // seconds
  polyline: string;
  startLocation: RouteWaypoint;
  endLocation: RouteWaypoint;
  startTime?: Date;
  endTime?: Date;
}

// Step-by-step instruction types
export interface RouteStep {
  id: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation: Coordinates;
  endLocation: Coordinates;
  polyline?: string;
}

// Complete route with alternatives
export interface Route {
  id: string;
  legs: RouteLeg[];
  distance: number; // meters
  duration: number; // seconds
  startLocation: RouteWaypoint;
  endLocation: RouteWaypoint;
  bounds: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
  overview_polyline: string;
  
  // Route metadata
  summary: string;
  copyrights: string;
  warnings: string[];
  fare?: {
    currency: string;
    value: number;
    text: string;
  };
  
  // Quality indicators
  confidence: number; // 0-1, route reliability
  isRealTime: boolean;
  lastUpdated: Date;
  
  // Provider attribution
  provider: RouteProvider;
  attribution: string;
}

// Route request parameters
export interface RouteRequest {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  mode: TransportMode;
  waypoints?: RouteWaypoint[];
  
  // Time preferences
  departureTime?: Date;
  arrivalTime?: Date;
  
  // Mode-specific preferences
  drivingOptions?: {
    avoidTolls: boolean;
    avoidHighways: boolean;
    avoidFerries: boolean;
    trafficModel: 'best_guess' | 'pessimistic' | 'optimistic';
  };
  
  transitOptions?: {
    modes: Array<'bus' | 'subway' | 'train' | 'tram' | 'rail'>;
    routingPreference: 'less_walking' | 'fewer_transfers';
    maxWalkingDistance?: number; // meters
  };
  
  cyclingOptions?: {
    avoidHills: boolean;
    avoidHighways: boolean;
    preferBikePaths: boolean;
  };
  
  // General preferences
  alternatives: boolean; // Request alternative routes
  optimize?: boolean; // Optimize waypoint order
  language?: string;
  region?: string;
  units: 'metric' | 'imperial';
}

// API Response structure
export interface RouteResponse {
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  routes: Route[];
  alternativeRoutes?: Route[];
  errorMessage?: string;
  
  // Provider information
  provider: RouteProvider;
  requestId: string;
  timestamp: Date;
  
  // Rate limiting info
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

// Error types
export interface RouteError extends Error {
  code: 'NETWORK_ERROR' | 'API_KEY_INVALID' | 'QUOTA_EXCEEDED' | 'NO_ROUTES_FOUND' | 'INVALID_REQUEST' | 'SERVICE_UNAVAILABLE';
  provider?: RouteProvider;
  originalError?: any;
  retryable: boolean;
}

// Service configuration
export interface RoutingConfig {
  providers: {
    [key in RouteProvider]?: {
      apiKey?: string;
      endpoint?: string;
      priority: number;
      capabilities: TransportMode[];
      rateLimits: {
        requestsPerSecond: number;
        requestsPerDay: number;
      };
    };
  };
  
  fallbackBehavior: {
    maxRetries: number;
    timeoutMs: number;
    fallbackToOffline: boolean;
  };
  
  caching: {
    enabled: boolean;
    ttlMinutes: number;
    maxCacheSize: number;
  };
  
  realTimeUpdates: {
    enabled: boolean;
    updateInterval: number; // seconds
    providers: RouteProvider[];
  };
}

// Route update types
export interface RouteUpdate {
  routeId: string;
  legId?: string;
  stepId?: string;
  updateType: 'delay' | 'cancellation' | 'route_change' | 'traffic' | 'weather';
  severity: 'info' | 'warning' | 'severe';
  message: string;
  newEstimatedTime?: Date;
  alternativeSuggested?: boolean;
  timestamp: Date;
}

// Caching support
export interface CachedRoute {
  request: RouteRequest;
  response: RouteResponse;
  cachedAt: Date;
  expiresAt: Date;
  region: string;
}
