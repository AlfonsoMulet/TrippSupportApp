import { create } from 'zustand';
import { FriendState, Friendship, FriendRequest } from '../types/friend';
import { FriendService } from '../services/FriendService';
import { collection, query, where, or, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useFriendStore = create<FriendState>((set, get) => {
  let friendsUnsubscribe: (() => void) | null = null;

  return {
    friends: [],
    friendRequests: [],
    sentRequests: [],
    loading: false,
    error: null,

    loadFriends: async (userId: string) => {
      set({ loading: true, error: null });

      try {
        if (friendsUnsubscribe) {
          friendsUnsubscribe();
        }

        const q = query(
          collection(db, 'friendships'),
          or(where('userId1', '==', userId), where('userId2', '==', userId))
        );

        friendsUnsubscribe = onSnapshot(
          q,
          async (snapshot) => {
            const friendships: Friendship[] = [];

            for (const docSnap of snapshot.docs) {
              const data = docSnap.data();
              const friendId = data.userId1 === userId ? data.userId2 : data.userId1;

              const friendProfile = await FriendService.getUserProfile(friendId);

              friendships.push({
                id: docSnap.id,
                userId1: data.userId1,
                userId2: data.userId2,
                createdAt: data.createdAt,
                user1Data: data.userId1 === userId ? undefined : friendProfile || undefined,
                user2Data: data.userId2 === userId ? undefined : friendProfile || undefined,
              });
            }

            set({ friends: friendships, loading: false });
          },
          (error) => {
            console.error('Error loading friends:', error);
            set({ error: error.message, loading: false });
          }
        );
      } catch (error: any) {
        console.error('Error setting up friends listener:', error);
        set({ error: error.message, loading: false });
      }
    },

    loadFriendRequests: async (userId: string) => {
      try {
        set({ loading: true, error: null });
        set({ loading: false });
      } catch (error: any) {
        console.error('Error loading friend requests:', error);
        set({ error: error.message, loading: false });
      }
    },

    generateInviteToken: async (userId: string, maxUses?: number) => {
      try {
        // Don't set global loading - modal handles its own loading state
        const token = await FriendService.createInviteToken(userId, maxUses);
        return token;
      } catch (error: any) {
        console.error('Error generating invite token:', error);
        set({ error: error.message });
        throw error;
      }
    },

    acceptInvite: async (token: string, userId: string) => {
      try {
        // Don't set global loading - modal handles its own loading state
        const result = await FriendService.validateAndUseToken(token, userId);

        if (!result.valid || !result.userId) {
          throw new Error(result.error || 'Invalid invite');
        }

        await FriendService.createFriendship(userId, result.userId);

        // The friends list will auto-update via the onSnapshot listener
      } catch (error: any) {
        console.error('Error accepting invite:', error);
        set({ error: error.message });
        throw error;
      }
    },

    removeFriend: async (friendshipId: string) => {
      try {
        set({ loading: true, error: null });
        const friendship = get().friends.find((f) => f.id === friendshipId);
        if (!friendship) {
          throw new Error('Friendship not found');
        }

        const userId = friendship.user1Data ? friendship.userId2 : friendship.userId1;
        await FriendService.removeFriendship(friendshipId, userId);

        set({ loading: false });
      } catch (error: any) {
        console.error('Error removing friend:', error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    declineRequest: async (_requestId: string) => {
      try {
        set({ loading: true, error: null });
        // TODO: Implement decline request logic
        set({ loading: false });
      } catch (error: any) {
        console.error('Error declining request:', error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    cleanup: () => {
      if (friendsUnsubscribe) {
        friendsUnsubscribe();
        friendsUnsubscribe = null;
      }
      set({
        friends: [],
        friendRequests: [],
        sentRequests: [],
        loading: false,
        error: null,
      });
    },
  };
});
