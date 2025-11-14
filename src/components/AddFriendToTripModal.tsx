import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useFriendStore } from '../store/friendStore';
import { useAuthStore } from '../store/authStore';
import { useTripStore } from '../store/tripStore';

interface AddFriendToTripModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  currentSharedWith: string[];
}

export default function AddFriendToTripModal({
  visible,
  onClose,
  tripId,
  currentSharedWith,
}: AddFriendToTripModalProps) {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { friends, loading: friendsLoading, loadFriends } = useFriendStore();
  const { updateTrip } = useTripStore();
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (visible && user?.uid) {
      console.log('Loading friends for user:', user.uid);
      loadFriends(user.uid);
      setSelectedFriends(currentSharedWith || []);
    }
  }, [visible, user?.uid]);

  useEffect(() => {
    console.log('Friends in modal:', friends.length, friends);
  }, [friends]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      await updateTrip(tripId, {
        sharedWith: selectedFriends,
        isCollaborative: selectedFriends.length > 0,
      });
      Alert.alert('Success', 'Trip collaborators updated!');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFriends([]);
    onClose();
  };

  const renderFriendItem = ({ item }: any) => {
    console.log('Rendering friend item:', item);
    const friendData = item.user1Data || item.user2Data;
    if (!friendData) {
      console.log('No friend data, skipping');
      return null;
    }

    const friendId = item.userId1 === user?.uid ? item.userId2 : item.userId1;
    const isSelected = selectedFriends.includes(friendId);
    console.log('Friend ID:', friendId, 'Selected:', isSelected);

    const initials = friendData.displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          { backgroundColor: theme.colors.card },
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        onPress={() => toggleFriend(friendId)}
      >
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
        <View
          style={[
            styles.checkbox,
            { borderColor: theme.colors.border },
            isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    panel: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '80%',
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    emptyText: {
      textAlign: 'center',
      padding: 40,
      color: theme.colors.textSecondary,
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    friendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    friendInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 16,
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
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Friends to Trip</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {friendsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.emptyText, { marginTop: 16 }]}>Loading friends...</Text>
              </View>
            ) : friends.length === 0 ? (
              <Text style={styles.emptyText}>
                No friends yet. Add friends to collaborate on trips!
              </Text>
            ) : (
              <FlatList
                data={friends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No friends available</Text>
                }
              />
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
