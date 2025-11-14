// Sharing and collaboration types for Trip Planner

export interface ShareToken {
  id: string;
  tripId: string;
  ownerId: string;
  token: string;
  isCollaborative: boolean;
  expiresAt: string;
  createdAt: string;
  maxUses?: number;
  currentUses: number;
}

export interface TripMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
  lastActive?: string;
}

export interface SharedTripData {
  tripId: string;
  tripName: string;
  tripDescription: string;
  ownerName: string;
  ownerEmail: string;
  stopsCount: number;
  startDate: string;
  endDate: string;
  isCollaborative: boolean;
  shareToken: string;
}

export interface ShareLinkData {
  url: string;
  token: string;
  qrCodeData: string; // Base64 encoded QR code
  expiresAt: string;
}
