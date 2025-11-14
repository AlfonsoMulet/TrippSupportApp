/**
 * Routing Configuration Manager - Clean Implementation
 */

import { RoutingConfig, RouteProvider, TransportMode } from '../types/routing';

export class RoutingConfigManager {
  private static instance: RoutingConfigManager;
  private config: RoutingConfig;

  private constructor() {
    this.config = this.createDefaultConfig();
  }

  static getInstance(): RoutingConfigManager {
    if (!RoutingConfigManager.instance) {
      RoutingConfigManager.instance = new RoutingConfigManager();
    }
    return RoutingConfigManager.instance;
  }

  private createDefaultConfig(): RoutingConfig {
    return {
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
        timeoutMs: 15000,
        fallbackToOffline: true,
      },
      caching: {
        enabled: true,
        ttlMinutes: 5,
        maxCacheSize: 50,
      },
      realTimeUpdates: {
        enabled: false,
        updateInterval: 60,
        providers: ['google'],
      },
    };
  }

  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  setApiKey(provider: RouteProvider, apiKey: string): void {
    if (this.config.providers[provider]) {
      this.config.providers[provider]!.apiKey = apiKey;
    }
  }

  getAvailableProviders(mode?: TransportMode): RouteProvider[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => {
        if (!config?.apiKey) return false;
        if (mode && !config.capabilities.includes(mode)) return false;
        return true;
      })
      .sort((a, b) => (a[1]?.priority || 0) - (b[1]?.priority || 0))
      .map(([provider]) => provider as RouteProvider);
  }

  isProviderAvailable(provider: RouteProvider, mode?: TransportMode): boolean {
    const config = this.config.providers[provider];
    if (!config?.apiKey) return false;
    if (mode && !config.capabilities.includes(mode)) return false;
    return true;
  }
}

// Error handling helper
export const handleRoutingError = (error: any): string => {
  if (error.code) {
    switch (error.code) {
      case 'NO_ROUTES_FOUND':
        return 'No route found between these locations';
      case 'NETWORK_ERROR':
        return 'Network error, please check your connection';
      case 'SERVICE_UNAVAILABLE':
        return 'Routing service temporarily unavailable';
      case 'QUOTA_EXCEEDED':
        return 'Too many requests, please try again later';
      default:
        return error.message || 'Route request failed';
    }
  }
  return error.message || 'Unknown routing error';
};

// Export singleton
export const routingConfig = RoutingConfigManager.getInstance();
