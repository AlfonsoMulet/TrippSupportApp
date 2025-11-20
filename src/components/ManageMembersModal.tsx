import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 1000;
import { SharingService } from '../services/SharingService';
import { Trip } from '../store/tripStore';
import { TripMember } from '../types/sharing';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useTripStore } from '../store/tripStore';
import { useTranslation } from '../i18n/useTranslation';
import AddFriendToTripModal from './AddFriendToTripModal';

interface ManageMembersModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
}

export default function ManageMembersModal({ visible, onClose, trip }: ManageMembersModalProps) {
  const [loading, setLoading] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { loadUserTrips } = useTripStore();
  const { t } = useTranslation();

  const dragY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const isOwner = user?.uid === trip.ownerId || user?.uid === trip.userId;

  const handleRemoveMember = async (member: TripMember) => {
    if (!isOwner) {
      Alert.alert(t('manageMembers.permissionDenied'), t('manageMembers.onlyOwnerRemove'));
      return;
    }
    Alert.alert(t('manageMembers.removeMember'), t('manageMembers.removeMemberConfirm', { name: member.displayName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('manageMembers.remove'), style: 'destructive',
        onPress: async () => {
          try {
            setRemovingMember(member.userId);
            const success = await SharingService.removeMember(trip.id, member.userId);
            if (success) {
              Alert.alert(t('common.success'), t('manageMembers.memberRemoved', { name: member.displayName }));
              await loadUserTrips();
            } else {
              Alert.alert(t('common.error'), t('manageMembers.removeError'));
            }
          } catch (error) {
            Alert.alert(t('common.error'), t('manageMembers.removeError'));
          } finally {
            setRemovingMember(null);
          }
        }
      }
    ]);
  };

  const handleChangeRole = async (member: TripMember) => {
    if (!isOwner) {
      Alert.alert(t('manageMembers.permissionDenied'), t('manageMembers.onlyOwnerRole'));
      return;
    }
    const newRole = member.role === 'editor' ? 'viewer' : 'editor';
    Alert.alert(t('manageMembers.changeRole'), t('manageMembers.changeRoleConfirm', { name: member.displayName, role: newRole }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          try {
            setLoading(true);
            const success = await SharingService.updateMemberRole(trip.id, member.userId, newRole as 'editor' | 'viewer');
            if (success) {
              Alert.alert(t('common.success'), t('manageMembers.roleUpdated', { role: newRole }));
              await loadUserTrips();
            } else {
              Alert.alert(t('common.error'), t('manageMembers.roleError'));
            }
          } catch (error) {
            Alert.alert(t('common.error'), t('manageMembers.roleError'));
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const handleLeaveTrip = async () => {
    if (!user) return;
    Alert.alert(t('manageMembers.leaveTrip'), t('manageMembers.leaveTripConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('manageMembers.leave'), style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const success = await SharingService.leaveCollaborativeTrip(trip.id, user.uid);
            if (success) {
              Alert.alert(t('common.success'), t('manageMembers.leftTrip'), [{ text: t('common.ok'), onPress: async () => { await loadUserTrips(); onClose(); } }]);
            } else {
              Alert.alert(t('common.error'), t('manageMembers.leaveError'));
            }
          } catch (error) {
            Alert.alert(t('common.error'), t('manageMembers.leaveError'));
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return theme.colors.primary;
      case 'editor': return theme.colors.success;
      case 'viewer': return theme.colors.textSecondary;
      default: return theme.colors.textSecondary;
    }
  };

  const formatJoinedDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      dragY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(dragY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragY } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        if (event.nativeEvent.translationY < 0) {
          dragY.setValue(0);
        }
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      if (translationY > DISMISS_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
        handleClose();
      } else {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }
    }
  };

  const clampedDragY = dragY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [0, SCREEN_HEIGHT],
    extrapolate: 'clamp',
  });

  const dynamicOverlayOpacity = Animated.multiply(
    overlayOpacity,
    clampedDragY.interpolate({
      inputRange: [0, DISMISS_THRESHOLD],
      outputRange: [1, 0.3],
      extrapolate: 'clamp',
    })
  );

  const panelTranslateY = clampedDragY;

  const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
    panel: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.8, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
    dragIndicator: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, flex: 1, textAlign: 'center' },
    closeButton: { padding: 4 },
    content: { padding: 20 },
    infoCard: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
    infoText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
    memberCard: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
    memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    memberAvatarText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
    memberEmail: { fontSize: 14, color: theme.colors.textSecondary },
    memberMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    roleBadgeText: { fontSize: 12, fontWeight: '600', color: 'white', textTransform: 'capitalize' },
    joinedText: { fontSize: 12, color: theme.colors.textSecondary },
    memberActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
    actionButtonDanger: { borderColor: theme.colors.error },
    actionButtonText: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
    actionButtonTextDanger: { color: theme.colors.error },
    inviteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 6, marginTop: 20 },
    inviteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    leaveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.error, gap: 6, marginTop: 12 },
    leaveButtonText: { color: theme.colors.error, fontSize: 16, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },
  });

  const members = trip.members || [];
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'owner') return -1;
    if (b.role === 'owner') return 1;
    return 0;
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.overlay, { opacity: dynamicOverlayOpacity }]} />
        </TouchableWithoutFeedback>

        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
          <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}>
            <View style={styles.dragIndicator} />
            <View style={styles.header}>
              <View style={{ width: 24 }} />
              <Text style={styles.headerTitle}>{t('manageMembers.title')}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>{isOwner ? t('manageMembers.ownerInfo') : t('manageMembers.memberInfo')}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('manageMembers.members')} ({sortedMembers.length})</Text>
            {sortedMembers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.border} />
                <Text style={styles.emptyText}>{t('manageMembers.noMembers')}</Text>
              </View>
            ) : (
              sortedMembers.map(member => {
                const isCurrentUser = user?.uid === member.userId;
                const isMemberOwner = member.role === 'owner';
                const isRemoving = removingMember === member.userId;
                return (
                  <View key={member.userId} style={styles.memberCard}>
                    <View style={styles.memberHeader}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{member.displayName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.displayName}{isCurrentUser && ` ${t('manageMembers.you')}`}</Text>
                        <Text style={styles.memberEmail}>{member.email}</Text>
                      </View>
                    </View>
                    <View style={styles.memberMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(member.role) }]}>
                        <Text style={styles.roleBadgeText}>{t(`manageMembers.${member.role}`)}</Text>
                      </View>
                      <Text style={styles.joinedText}>{t('manageMembers.joined')} {formatJoinedDate(member.joinedAt)}</Text>
                    </View>
                    {isOwner && !isMemberOwner && !isCurrentUser && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleChangeRole(member)} disabled={loading || isRemoving}>
                          <Ionicons name="swap-horizontal" size={16} color={theme.colors.text} />
                          <Text style={styles.actionButtonText}>{member.role === 'editor' ? t('manageMembers.makeViewer') : t('manageMembers.makeEditor')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleRemoveMember(member)} disabled={loading || isRemoving}>
                          {isRemoving ? <ActivityIndicator size="small" color={theme.colors.error} /> : (
                            <>
                              <Ionicons name="person-remove" size={16} color={theme.colors.error} />
                              <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>{t('manageMembers.remove')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            {!isOwner ? (
              <>
                <TouchableOpacity
                  style={[styles.inviteButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowInviteModal(true)}
                  disabled={loading}
                >
                  <Ionicons name="person-add" size={20} color="#FFFFFF" />
                  <Text style={styles.inviteButtonText}>{t('manageMembers.inviteFriends')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveTrip} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color={theme.colors.error} /> : (
                    <>
                      <Ionicons name="exit-outline" size={20} color={theme.colors.error} />
                      <Text style={styles.leaveButtonText}>{t('manageMembers.leaveTrip')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Invite Friends Modal */}
      <AddFriendToTripModal
        visible={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          loadUserTrips();
        }}
        tripId={trip.id}
        currentSharedWith={trip.sharedWith || []}
      />
    </Modal>
  );
}
