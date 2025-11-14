import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  or,
  and,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FriendRequest, Friendship, FriendInviteToken, UserProfile } from '../types/friend';

export class FriendService {
  static generate8DigitCode(): string {
    // Generate 8 random digits
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  static async createInviteToken(
    userId: string,
    maxUses?: number
  ): Promise<string> {
    // Check if user already has a permanent friend code
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().friendCode) {
      // Return existing permanent code
      return userDoc.data().friendCode;
    }

    // Generate new permanent 8-digit code
    let code = this.generate8DigitCode();

    // Ensure code is unique
    let isUnique = false;
    while (!isUnique) {
      const q = query(
        collection(db, 'users'),
        where('friendCode', '==', code)
      );
      const existing = await getDocs(q);
      if (existing.empty) {
        isUnique = true;
      } else {
        code = this.generate8DigitCode();
      }
    }

    // Save permanent code to user profile (create doc if it doesn't exist)
    await setDoc(
      userRef,
      {
        friendCode: code,
        friendCodeCreatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return code;
  }

  static async validateAndUseToken(
    token: string,
    currentUserId: string
  ): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      // Look up user by permanent friend code
      const q = query(
        collection(db, 'users'),
        where('friendCode', '==', token)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { valid: false, error: 'Invalid friend code' };
      }

      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;

      if (userId === currentUserId) {
        return { valid: false, error: "You can't add yourself" };
      }

      const alreadyFriends = await this.areFriends(currentUserId, userId);
      if (alreadyFriends) {
        return { valid: false, error: 'Already friends' };
      }

      return { valid: true, userId };
    } catch (error) {
      console.error('Error validating token:', error);
      return { valid: false, error: 'Something went wrong' };
    }
  }

  static async createFriendship(userId1: string, userId2: string): Promise<void> {
    const [user1, user2] = [userId1, userId2].sort();

    const existingQ = query(
      collection(db, 'friendships'),
      where('userId1', '==', user1),
      where('userId2', '==', user2)
    );
    const existing = await getDocs(existingQ);

    if (!existing.empty) {
      return;
    }

    await addDoc(collection(db, 'friendships'), {
      userId1: user1,
      userId2: user2,
      createdAt: new Date().toISOString(),
    });

    const user1Ref = doc(db, 'users', userId1);
    const user2Ref = doc(db, 'users', userId2);
    const user1Doc = await getDoc(user1Ref);
    const user2Doc = await getDoc(user2Ref);

    if (user1Doc.exists()) {
      const currentCount = user1Doc.data().friendCount || 0;
      await updateDoc(user1Ref, { friendCount: currentCount + 1 });
    }

    if (user2Doc.exists()) {
      const currentCount = user2Doc.data().friendCount || 0;
      await updateDoc(user2Ref, { friendCount: currentCount + 1 });
    }
  }

  static async getFriends(userId: string): Promise<Friendship[]> {
    const q = query(
      collection(db, 'friendships'),
      or(where('userId1', '==', userId), where('userId2', '==', userId))
    );

    const snapshot = await getDocs(q);
    const friendships: Friendship[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const friendId = data.userId1 === userId ? data.userId2 : data.userId1;

      const userDoc = await getDoc(doc(db, 'users', friendId));
      let friendData: UserProfile | undefined;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        friendData = {
          uid: friendId,
          email: userData.email || '',
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Friend',
          photoURL: userData.photoURL,
          friendCount: userData.friendCount || 0,
        };
      }

      friendships.push({
        id: docSnap.id,
        userId1: data.userId1,
        userId2: data.userId2,
        createdAt: data.createdAt,
        user1Data: data.userId1 === userId ? undefined : friendData,
        user2Data: data.userId2 === userId ? undefined : friendData,
      });
    }

    return friendships;
  }

  static async removeFriendship(friendshipId: string, userId: string): Promise<void> {
    const friendshipRef = doc(db, 'friendships', friendshipId);
    const friendshipDoc = await getDoc(friendshipRef);

    if (!friendshipDoc.exists()) {
      throw new Error('Friendship not found');
    }

    const data = friendshipDoc.data();
    const otherUserId = data.userId1 === userId ? data.userId2 : data.userId1;

    await deleteDoc(friendshipRef);

    const user1Ref = doc(db, 'users', userId);
    const user2Ref = doc(db, 'users', otherUserId);
    const user1Doc = await getDoc(user1Ref);
    const user2Doc = await getDoc(user2Ref);

    if (user1Doc.exists()) {
      const currentCount = user1Doc.data().friendCount || 0;
      await updateDoc(user1Ref, { friendCount: Math.max(0, currentCount - 1) });
    }

    if (user2Doc.exists()) {
      const currentCount = user2Doc.data().friendCount || 0;
      await updateDoc(user2Ref, { friendCount: Math.max(0, currentCount - 1) });
    }
  }

  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const [user1, user2] = [userId1, userId2].sort();

    const q = query(
      collection(db, 'friendships'),
      where('userId1', '==', user1),
      where('userId2', '==', user2)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    return {
      uid: userId,
      email: data.email || '',
      displayName: data.displayName || data.email?.split('@')[0] || 'Friend',
      photoURL: data.photoURL,
      friendCount: data.friendCount || 0,
    };
  }
}
