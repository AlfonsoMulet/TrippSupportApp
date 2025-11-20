import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ShareToken, SharedTripData, ShareLinkData, TripMember } from '../types/sharing';
import { Trip } from '../store/tripStore';

// Generate a random share token
const generateShareToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Generate QR code data URL (using a simple QR API)
const generateQRCode = async (url: string): Promise<string> => {
  try {
    // Using QR Server API for simplicity
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    return qrUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return '';
  }
};

export class SharingService {
  /**
   * Create a shareable link for a trip
   * @param trip The trip to share
   * @param isCollaborative If true, recipients can edit the trip
   * @param expiresInDays Number of days until the link expires (default: 30)
   * @param maxUses Maximum number of times the link can be used (optional)
   */
  static async createShareLink(
    trip: Trip,
    isCollaborative: boolean,
    expiresInDays: number = 30,
    maxUses?: number
  ): Promise<ShareLinkData> {
    try {
      console.log('🔄 Creating share link for trip:', trip.id, trip.name);

      // Check if Firebase is initialized
      if (!db) {
        throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
      }

      // Validate that we have the necessary trip data
      if (!trip.id) {
        throw new Error('Trip ID is required to create a share link');
      }

      const ownerId = trip.ownerId || trip.userId;
      if (!ownerId) {
        throw new Error('Trip must have an owner ID to create a share link');
      }

      const token = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const shareTokenData: Omit<ShareToken, 'id'> = {
        tripId: trip.id,
        ownerId,
        token,
        isCollaborative,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        ...(maxUses !== undefined && { maxUses }),
        currentUses: 0,
      };

      console.log('💾 Saving share token to Firestore...');
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'shareTokens'), shareTokenData);
      console.log('✅ Share token saved with ID:', docRef.id);

      console.log('🔄 Updating trip document with share token...');
      // Update trip with share token
      const tripRef = doc(db, 'trips', trip.id);
      await updateDoc(tripRef, {
        shareToken: token,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Trip document updated');

      // Generate deep link URL
      const shareUrl = `tripplanner://share/${token}`;

      console.log('🔄 Generating QR code...');
      // Generate QR code
      const qrCodeData = await generateQRCode(shareUrl);
      console.log('✅ QR code generated');

      console.log(`✅ Share link created for trip "${trip.name}": ${shareUrl}`);

      return {
        url: shareUrl,
        token,
        qrCodeData,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to create share link:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Get trip data from a share token
   */
  static async getTripFromShareToken(token: string): Promise<SharedTripData | null> {
    try {
      // Find the share token document
      const q = query(collection(db, 'shareTokens'), where('token', '==', token));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('❌ Share token not found');
        return null;
      }

      const shareTokenDoc = querySnapshot.docs[0];
      const shareToken = { id: shareTokenDoc.id, ...shareTokenDoc.data() } as ShareToken;

      // Check if expired
      if (new Date(shareToken.expiresAt) < new Date()) {
        console.log('❌ Share token has expired');
        return null;
      }

      // Check max uses
      if (shareToken.maxUses && shareToken.currentUses >= shareToken.maxUses) {
        console.log('❌ Share token has reached max uses');
        return null;
      }

      // Get the trip data
      const tripRef = doc(db, 'trips', shareToken.tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        console.log('❌ Trip not found');
        return null;
      }

      const tripData = { id: tripDoc.id, ...tripDoc.data() } as Trip;

      // Get owner info
      const ownerDoc = await getDoc(doc(db, 'users', shareToken.ownerId));
      const ownerData = ownerDoc.exists() ? ownerDoc.data() : null;

      // Get stops count
      const stopsQuery = query(collection(db, 'stops'), where('tripId', '==', tripData.id));
      const stopsSnapshot = await getDocs(stopsQuery);

      const sharedData: SharedTripData = {
        tripId: tripData.id,
        tripName: tripData.name,
        tripDescription: tripData.description,
        ownerName: ownerData?.displayName || 'Unknown',
        ownerEmail: ownerData?.email || '',
        stopsCount: stopsSnapshot.size,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        isCollaborative: shareToken.isCollaborative,
        shareToken: token,
      };

      console.log(`✅ Retrieved shared trip data for token: ${token}`);
      return sharedData;
    } catch (error) {
      console.error('Failed to get trip from share token:', error);
      return null;
    }
  }

  /**
   * Accept a shared trip (copy or join collaborative)
   */
  static async acceptSharedTrip(
    token: string,
    userId: string,
    userEmail: string,
    userDisplayName: string
  ): Promise<{ success: boolean; tripId: string; message: string }> {
    try {
      // Get share token
      const q = query(collection(db, 'shareTokens'), where('token', '==', token));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, tripId: '', message: 'Invalid share link' };
      }

      const shareTokenDoc = querySnapshot.docs[0];
      const shareToken = { id: shareTokenDoc.id, ...shareTokenDoc.data() } as ShareToken;

      // Check expiration
      if (new Date(shareToken.expiresAt) < new Date()) {
        return { success: false, tripId: '', message: 'This share link has expired' };
      }

      // Check max uses
      if (shareToken.maxUses && shareToken.currentUses >= shareToken.maxUses) {
        return { success: false, tripId: '', message: 'This share link has reached its maximum uses' };
      }

      // Get original trip
      const tripRef = doc(db, 'trips', shareToken.tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        return { success: false, tripId: '', message: 'Trip not found' };
      }

      const originalTrip = { id: tripDoc.id, ...tripDoc.data() } as Trip;

      // Check if user already has access
      if (originalTrip.userId === userId || originalTrip.sharedWith?.includes(userId)) {
        return { success: false, tripId: originalTrip.id, message: 'You already have access to this trip' };
      }

      if (shareToken.isCollaborative) {
        // Add user to collaborative trip
        const member: TripMember = {
          userId,
          email: userEmail,
          displayName: userDisplayName,
          role: 'editor',
          joinedAt: new Date().toISOString(),
        };

        const updatedSharedWith = [...(originalTrip.sharedWith || []), userId];
        const updatedMembers = [...(originalTrip.members || []), member];

        await updateDoc(tripRef, {
          sharedWith: updatedSharedWith,
          members: updatedMembers,
          updatedAt: new Date().toISOString(),
        });

        // Increment usage count
        await updateDoc(doc(db, 'shareTokens', shareTokenDoc.id), {
          currentUses: shareToken.currentUses + 1,
        });

        console.log(`✅ User ${userId} joined collaborative trip ${originalTrip.id}`);
        return {
          success: true,
          tripId: originalTrip.id,
          message: `You've joined "${originalTrip.name}" as a collaborator!`,
        };
      } else {
        // Copy trip to user's account (non-collaborative)
        const newTripData = {
          ...originalTrip,
          userId,
          ownerId: userId,
          sharedWith: [],
          isCollaborative: false,
          shareToken: undefined,
          members: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Remove the id for new document
        const { id, ...tripDataWithoutId } = newTripData;
        const newTripRef = await addDoc(collection(db, 'trips'), tripDataWithoutId);

        // Copy stops
        const stopsQuery = query(collection(db, 'stops'), where('tripId', '==', originalTrip.id));
        const stopsSnapshot = await getDocs(stopsQuery);
        
        const batch = writeBatch(db);
        stopsSnapshot.docs.forEach((stopDoc) => {
          const stopData = stopDoc.data();
          const newStopRef = doc(collection(db, 'stops'));
          batch.set(newStopRef, {
            ...stopData,
            tripId: newTripRef.id,
            createdAt: new Date().toISOString(),
          });
        });

        // Copy transport segments
        const segmentsQuery = query(collection(db, 'transportSegments'), where('tripId', '==', originalTrip.id));
        const segmentsSnapshot = await getDocs(segmentsQuery);
        
        segmentsSnapshot.docs.forEach((segmentDoc) => {
          const segmentData = segmentDoc.data();
          const newSegmentRef = doc(collection(db, 'transportSegments'));
          batch.set(newSegmentRef, {
            ...segmentData,
            tripId: newTripRef.id,
            createdAt: new Date().toISOString(),
          });
        });

        await batch.commit();

        // Increment usage count
        await updateDoc(doc(db, 'shareTokens', shareTokenDoc.id), {
          currentUses: shareToken.currentUses + 1,
        });

        console.log(`✅ Trip ${originalTrip.id} copied to user ${userId} as ${newTripRef.id}`);
        return {
          success: true,
          tripId: newTripRef.id,
          message: `"${originalTrip.name}" has been added to your trips!`,
        };
      }
    } catch (error) {
      console.error('Failed to accept shared trip:', error);
      return {
        success: false,
        tripId: '',
        message: 'Failed to add trip. Please try again.',
      };
    }
  }

  /**
   * Revoke a share link
   */
  static async revokeShareLink(tripId: string): Promise<boolean> {
    try {
      const q = query(collection(db, 'shareTokens'), where('tripId', '==', tripId));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Remove share token from trip
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        shareToken: null,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Share link revoked for trip ${tripId}`);
      return true;
    } catch (error) {
      console.error('Failed to revoke share link:', error);
      return false;
    }
  }

  /**
   * Remove a member from a collaborative trip
   */
  static async removeMember(tripId: string, userId: string): Promise<boolean> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        return false;
      }

      const trip = { id: tripDoc.id, ...tripDoc.data() } as Trip;

      const updatedSharedWith = trip.sharedWith?.filter(id => id !== userId) || [];
      const updatedMembers = trip.members?.filter(m => m.userId !== userId) || [];

      await updateDoc(tripRef, {
        sharedWith: updatedSharedWith,
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ User ${userId} removed from trip ${tripId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove member:', error);
      return false;
    }
  }

  /**
   * Update member role in a collaborative trip
   */
  static async updateMemberRole(
    tripId: string,
    userId: string,
    newRole: 'editor' | 'viewer'
  ): Promise<boolean> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        return false;
      }

      const trip = { id: tripDoc.id, ...tripDoc.data() } as Trip;

      const updatedMembers = trip.members?.map(m =>
        m.userId === userId ? { ...m, role: newRole } : m
      ) || [];

      await updateDoc(tripRef, {
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ User ${userId} role updated to ${newRole} in trip ${tripId}`);
      return true;
    } catch (error) {
      console.error('Failed to update member role:', error);
      return false;
    }
  }

  /**
   * Leave a collaborative trip
   */
  static async leaveCollaborativeTrip(tripId: string, userId: string): Promise<boolean> {
    return await this.removeMember(tripId, userId);
  }

  /**
   * Add members to a collaborative trip
   */
  static async addMembers(
    tripId: string,
    userIds: string[],
    userEmails: { [userId: string]: string },
    userDisplayNames: { [userId: string]: string }
  ): Promise<boolean> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        console.error('Trip not found');
        return false;
      }

      const trip = { id: tripDoc.id, ...tripDoc.data() } as Trip;

      // Get existing members
      const existingMemberIds = trip.members?.map(m => m.userId) || [];
      const existingSharedWith = trip.sharedWith || [];

      // Filter out users who are already members
      const newUserIds = userIds.filter(
        id => !existingMemberIds.includes(id) && !existingSharedWith.includes(id)
      );

      if (newUserIds.length === 0) {
        console.log('All selected users are already members');
        return true;
      }

      // Create new member objects
      const newMembers: TripMember[] = newUserIds.map(userId => ({
        userId,
        email: userEmails[userId] || '',
        displayName: userDisplayNames[userId] || 'Unknown',
        role: 'editor',
        joinedAt: new Date().toISOString(),
      }));

      // Update trip with new members
      const updatedMembers = [...(trip.members || []), ...newMembers];
      const updatedSharedWith = [...existingSharedWith, ...newUserIds];

      await updateDoc(tripRef, {
        members: updatedMembers,
        sharedWith: updatedSharedWith,
        isCollaborative: true,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Added ${newUserIds.length} new members to trip ${tripId}`);
      return true;
    } catch (error) {
      console.error('Failed to add members:', error);
      return false;
    }
  }
}
