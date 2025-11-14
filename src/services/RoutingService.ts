/**
 * Enhanced Routing Service - Clean Implementation
 * Provides realistic multi-modal routing with provider fallback
 */

import {
  TransportMode,
  RouteProvider,
  RouteRequest,
  RouteResponse,
  Route,
  RouteLeg,
  RouteStep,
  Coordinates,
  RouteWaypoint,
  RouteError,
  RoutingConfig,
} from '../types/routing';

// Simple cache implementation
class RouteCache {
  private cache = new Map<string, { response: RouteResponse; expires: number }>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string): RouteResponse | null {
    const cached = this.cache.get(key);
    if (!cached || cached.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return cached.response;
  }

  set(key: string, response: RouteResponse): void {
    this.cache.set(key, {
      response,
      expires: Date.now() + this.ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Request cancellation
class RequestManager {
  private requests = new Map<string, AbortController>();

  createRequest(id: string): AbortController {
    this.cancelRequest(id);
    const controller = new AbortController();
    this.requests.set(id, controller);
    return controller;
  }

  cancelRequest(id: string): void {
    const controller = this.requests.get(id);
    if (controller) {
      controller.abort();
      this.requests.delete(id);
    }
  }
}

export class RoutingService {
  private cache = new RouteCache();
  private requestManager = new RequestManager();
  private config: RoutingConfig;

  constructor(config: RoutingConfig) {
    this.config = config;
  }

  async getRoute(request: RouteRequest): Promise<RouteResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache
    if (this.config.caching.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('Cache hit for route request');
        return cached;
      }
    }

    const requestId = this.generateRequestId();
    const controller = this.requestManager.createRequest(requestId);

    try {
      let response: RouteResponse;

      // Try primary provider first
      try {
        response = await this.getRouteFromProvider(request, 'google', controller);
      } catch (error) {
        console.warn('Primary provider failed, trying fallback:', error);
        response = await this.getRouteFromProvider(request, 'fallback', controller);
      }

      // Cache successful response
      if (response.status === 'OK' && this.config.caching.enabled) {
        this.cache.set(cacheKey, response);
      }

      return response;
    } finally {
      this.requestManager.cancelRequest(requestId);
    }
  }

  private async getRouteFromProvider(
    request: RouteRequest,
    provider: RouteProvider | 'fallback',
    controller: AbortController
  ): Promise<RouteResponse> {
    if (provider === 'fallback') {
      return this.createFallbackRoute(request);
    }

    // For Google API (when available)
    const apiKey = this.config.providers.google?.apiKey;
    if (!apiKey) {
      throw new Error('No API key configured');
    }

    return this.getGoogleRoute(request, controller, apiKey);
  }

  private async getGoogleRoute(
    request: RouteRequest,
    controller: AbortController,
    apiKey: string
  ): Promise<RouteResponse> {
    const params = new URLSearchParams({
      origin: `${request.origin.latitude},${request.origin.longitude}`,
      destination: `${request.destination.latitude},${request.destination.longitude}`,
      mode: request.mode,
      key: apiKey,
      alternatives: request.alternatives ? 'true' : 'false',
    });

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.convertGoogleResponse(data, request);
    } catch (error: any) {
      console.error('Google API error:', error);
      throw new Error(`Google routing failed: ${error.message}`);
    }
  }

  private createFallbackRoute(request: RouteRequest): RouteResponse {
    const straightLineCoords = [
      { latitude: request.origin.latitude, longitude: request.origin.longitude },
      { latitude: request.destination.latitude, longitude: request.destination.longitude }
    ];

    const distance = this.calculateDistance(
      request.origin,
      request.destination
    );

    const route: Route = {
      id: this.generateRequestId(),
      legs: [{
        id: this.generateRequestId(),
        mode: request.mode,
        steps: [],
        distance: distance * 1000, // Convert to meters
        duration: this.estimateDuration(distance, request.mode),
        polyline: this.encodePolyline(straightLineCoords),
        startLocation: request.origin,
        endLocation: request.destination,
      }],
      distance: distance * 1000,
      duration: this.estimateDuration(distance, request.mode),
      startLocation: request.origin,
      endLocation: request.destination,
      bounds: {
        northeast: {
          latitude: Math.max(request.origin.latitude, request.destination.latitude),
          longitude: Math.max(request.origin.longitude, request.destination.longitude),
        },
        southwest: {
          latitude: Math.min(request.origin.latitude, request.destination.latitude),
          longitude: Math.min(request.origin.longitude, request.destination.longitude),
        },
      },
      overview_polyline: this.encodePolyline(straightLineCoords),
      summary: `${request.mode} route (estimated)`,
      copyrights: 'Fallback routing',
      warnings: ['This is an estimated route'],
      confidence: 0.5,
      isRealTime: false,
      lastUpdated: new Date(),
      provider: 'fallback' as RouteProvider,
      attribution: 'Estimated routing',
    };

    return {
      status: 'OK',
      routes: [route],
      provider: 'fallback' as RouteProvider,
      requestId: this.generateRequestId(),
      timestamp: new Date(),
    };
  }

  private convertGoogleResponse(data: any, request: RouteRequest): RouteResponse {
    if (data.status !== 'OK') {
      const error = new Error(`Google API error: ${data.status}`) as RouteError;
      error.name = 'RouteError';
      error.code = data.status === 'ZERO_RESULTS' ? 'NO_ROUTES_FOUND' : 'SERVICE_UNAVAILABLE';
      error.retryable = data.status !== 'INVALID_REQUEST';
      throw error;
    }

    const routes: Route[] = data.routes.map((route: any) => this.convertGoogleRoute(route, request));
    
    return {
      status: 'OK',
      routes: routes.slice(0, 1),
      alternativeRoutes: routes.slice(1),
      provider: 'google',
      requestId: this.generateRequestId(),
      timestamp: new Date(),
    };
  }

  private convertGoogleRoute(googleRoute: any, request: RouteRequest): Route {
    const legs: RouteLeg[] = googleRoute.legs.map((leg: any) => ({
      id: this.generateRequestId(),
      mode: request.mode,
      steps: [], // Simplified for clean implementation
      distance: leg.distance.value,
      duration: leg.duration.value,
      polyline: googleRoute.overview_polyline.points,
      startLocation: {
        latitude: leg.start_location.lat,
        longitude: leg.start_location.lng,
        address: leg.start_address,
      },
      endLocation: {
        latitude: leg.end_location.lat,
        longitude: leg.end_location.lng,
        address: leg.end_address,
      },
    }));

    return {
      id: this.generateRequestId(),
      legs,
      distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
      duration: legs.reduce((sum, leg) => sum + leg.duration, 0),
      startLocation: request.origin,
      endLocation: request.destination,
      bounds: {
        northeast: {
          latitude: googleRoute.bounds.northeast.lat,
          longitude: googleRoute.bounds.northeast.lng,
        },
        southwest: {
          latitude: googleRoute.bounds.southwest.lat,
          longitude: googleRoute.bounds.southwest.lng,
        },
      },
      overview_polyline: googleRoute.overview_polyline.points,
      summary: googleRoute.summary,
      copyrights: googleRoute.copyrights,
      warnings: googleRoute.warnings || [],
      confidence: 0.9,
      isRealTime: request.mode === 'driving' || request.mode === 'transit',
      lastUpdated: new Date(),
      provider: 'google',
      attribution: '© Google',
    };
  }

  // Utility methods
  private calculateDistance(origin: Coordinates, destination: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = (destination.latitude - origin.latitude) * Math.PI / 180;
    const dLon = (destination.longitude - origin.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(origin.latitude * Math.PI / 180) * Math.cos(destination.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private estimateDuration(distanceKm: number, mode: TransportMode): number {
    const speeds = {
      walking: 5,    // km/h
      bicycling: 20, // km/h
      driving: 50,   // km/h
      transit: 30,   // km/h
      flight: 500,   // km/h
    };
    return Math.round((distanceKm / speeds[mode]) * 3600); // Convert to seconds
  }

  private encodePolyline(coordinates: Array<{latitude: number, longitude: number}>): string {
    // Simplified polyline encoding
    return coordinates.map(c => `${c.latitude},${c.longitude}`).join('|');
  }

  private getCacheKey(request: RouteRequest): string {
    return `${request.origin.latitude},${request.origin.longitude}-${request.destination.latitude},${request.destination.longitude}-${request.mode}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  clearCache(): void {
    this.cache.clear();
  }

  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Default configuration
export const defaultRoutingConfig: RoutingConfig = {
  providers: {
    google: {
      apiKey: 'AIzaSyDgpPXqecqrcuikozBRy4AYwFGpN1a32w0',
      priority: 1,
      capabilities: ['driving', 'walking', 'bicycling', 'transit'],
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerDay: 25000,
      },
    },
  },
  fallbackBehavior: {
    maxRetries: 3,
    timeoutMs: 10000,
    fallbackToOffline: true,
  },
  caching: {
    enabled: true,
    ttlMinutes: 5,
    maxCacheSize: 100,
  },
  realTimeUpdates: {
    enabled: false,
    updateInterval: 60,
    providers: ['google'],
  },
};
