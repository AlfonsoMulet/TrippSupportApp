export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserName: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  token: string;
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: string;
  user1Data?: UserProfile;
  user2Data?: UserProfile;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  friendCount?: number;
}

export interface FriendInviteToken {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  maxUses?: number;
  currentUses: number;
}

export interface FriendState {
  friends: Friendship[];
  friendRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  loading: boolean;
  error: string | null;

  loadFriends: (userId: string) => Promise<void>;
  loadFriendRequests: (userId: string) => Promise<void>;
  generateInviteToken: (userId: string, maxUses?: number) => Promise<string>;
  acceptInvite: (token: string, userId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cleanup: () => void;
}
