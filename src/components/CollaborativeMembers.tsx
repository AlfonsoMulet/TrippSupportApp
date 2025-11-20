import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import ManageMembersModal from './ManageMembersModal';

interface CollaborativeMembersProps {
  trip: Trip;
  currentUserId: string;
  onMemberRemoved: () => void;
}

export default function CollaborativeMembers({
  trip,
  currentUserId,
  onMemberRemoved,
}: CollaborativeMembersProps) {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const { theme } = useThemeStore();

  const members = trip.members || [];
  const isOwner = currentUserId === trip.ownerId || currentUserId === trip.userId;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    badge: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    membersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    memberAvatars: {
      flexDirection: 'row',
      marginRight: 8,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
      borderWidth: 2,
      borderColor: theme.colors.card,
    },
    avatarFirst: {
      marginLeft: 0,
    },
    avatarText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: 'white',
    },
    memberCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    manageButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    description: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
      lineHeight: 20,
    },
  });

  if (!trip.isCollaborative || members.length === 0) {
    return null;
  }

  // Show max 4 avatars
  const displayedMembers = members.slice(0, 4);
  const remainingCount = Math.max(0, members.length - 4);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={20} color={theme.colors.primary} />
            <Text style={styles.title}>Collaborative Trip</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LIVE</Text>
            </View>
          </View>
        </View>

        <View style={styles.membersRow}>
          <View style={styles.memberAvatars}>
            {displayedMembers.map((member, index) => (
              <View
                key={member.userId}
                style={[styles.avatar, index === 0 && styles.avatarFirst]}
              >
                <Text style={styles.avatarText}>
                  {member.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {remainingCount > 0 && (
              <View style={[styles.avatar]}>
                <Text style={styles.avatarText}>+{remainingCount}</Text>
              </View>
            )}
          </View>

          <Text style={styles.memberCount}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>

          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setShowMembersModal(true)}
          >
            <Ionicons name={isOwner ? "settings-outline" : "people-outline"} size={16} color={theme.colors.text} />
            <Text style={styles.manageButtonText}>{isOwner ? 'Manage' : 'Members'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          {isOwner
            ? 'Everyone can edit this trip. Changes sync in real-time.'
            : 'This is a shared trip. Your changes are visible to all members. You can invite friends!'}
        </Text>
      </View>

      <ManageMembersModal
        visible={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        trip={trip}
      />
    </>
  );
}
