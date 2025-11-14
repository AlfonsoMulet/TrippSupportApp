import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useFriendStore } from '../store/friendStore';
import { useAuthStore } from '../store/authStore';
import { Friendship } from '../types/friend';
import FriendInviteModal from '../components/FriendInviteModal';

export default function FriendsScreen() {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { friends, loading, loadFriends, removeFriend } = useFriendStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadFriends(user.uid);
    }

    return () => {
      useFriendStore.getState().cleanup();
    };
  }, [user?.uid]);

  const handleRemoveFriend = (friendship: Friendship) => {
    const friendData = friendship.user1Data || friendship.user2Data;
    const friendName = friendData?.displayName || 'this friend';

    Alert.alert(
      'Remove Friend',
      `Remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friendship.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const renderFriendCard = ({ item }: { item: Friendship }) => {
    const friendData = item.user1Data || item.user2Data;
    if (!friendData) return null;

    const initials = friendData.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <View style={[styles.friendCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.friendInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, { color: theme.colors.text }]}>
              {friendData.displayName}
            </Text>
            <Text style={[styles.friendEmail, { color: theme.colors.textSecondary }]}>
              {friendData.email}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFriend(item)}
        >
          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 60,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.07,
      shadowRadius: 8,
      elevation: 12,
      zIndex: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    actionButtons: {
      flexDirection: 'row',
      padding: 16,
      paddingTop: 90,
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    inviteButton: {
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    listContainer: {
      padding: 16,
      paddingTop: 10,
    },
    friendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    friendInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    friendDetails: {
      flex: 1,
    },
    friendName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    friendEmail: {
      fontSize: 14,
    },
    removeButton: {
      padding: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      paddingTop: 140,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (loading && friends.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerSubtitle}>
            0 friends
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <Text style={styles.headerSubtitle}>
          {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.inviteButton]}
          onPress={() => setShowInviteModal(true)}
        >
          <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Add Friend</Text>
        </TouchableOpacity>
      </View>

      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="people-outline"
            size={64}
            color={theme.colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyText}>
            Share your invite link or enter a friend code to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriendCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <FriendInviteModal visible={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </SafeAreaView>
  );
}
