import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useFriendStore } from '../store/friendStore';
import { useAuthStore } from '../store/authStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FriendInviteModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FriendInviteModal({ visible, onClose }: FriendInviteModalProps) {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { generateInviteToken, acceptInvite } = useFriendStore();
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'share' | 'add'>('share');

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down (positive dy)
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If dragged down more than 150px or with high velocity, close
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          closeModal();
        } else {
          // Spring back to original position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleGenerateCode = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const code = await generateInviteToken(user.uid);
      setGeneratedCode(code);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!generatedCode) {
      await handleGenerateCode();
      return;
    }

    try {
      await Share.share({
        message: `Add me on TripPlanner! Use code: ${generatedCode}`,
        title: 'Add me as a friend',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!inviteCode.trim() || inviteCode.length !== 8 || !user?.uid) return;

    setLoading(true);
    try {
      await acceptInvite(inviteCode.trim(), user.uid);
      Alert.alert('Success', 'Friend added!');
      setInviteCode('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      panY.setValue(0);
      onClose();
      // Reset state after animation completes
      setTimeout(() => {
        setInviteCode('');
        setGeneratedCode('');
        setMode('share');
        setLoading(false);
      }, 100);
    });
  };

  const handleClose = () => {
    closeModal();
  };

  // Handle opening/closing animations
  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when not visible
      slideAnim.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      panY.setValue(0);
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && mode === 'share' && !generatedCode && user?.uid) {
      handleGenerateCode();
    }
  }, [visible, mode, generatedCode, user?.uid]);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    panel: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: SCREEN_HEIGHT *0.8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    dragIndicatorContainer: {
      paddingVertical: 12,
      paddingTop: 12,
      alignItems: 'center',
    },
    dragIndicator: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
    },
    contentContainer: {
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    modeSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    modeButtonActive: {
      backgroundColor: theme.colors.card,
    },
    modeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    modeButtonTextActive: {
      color: theme.colors.primary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    codeContainer: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    code: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.primary,
      letterSpacing: 4,
      fontFamily: 'monospace',
    },
    placeholderCode: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.border,
      letterSpacing: 4,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 24,
      color: theme.colors.text,
      fontFamily: 'monospace',
      letterSpacing: 4,
      textAlign: 'center',
      marginBottom: 16,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.secondary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.panel,
            {
              transform: [
                { translateY: Animated.add(slideAnim, panY) }
              ],
            },
          ]}
        >
            <View style={styles.dragIndicatorContainer}>
              <View style={styles.dragIndicator} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Friends</Text>
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'share' && styles.modeButtonActive]}
                onPress={() => setMode('share')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'share' && styles.modeButtonTextActive,
                  ]}
                >
                  Share Code
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'add' && styles.modeButtonActive]}
                onPress={() => setMode('add')}
              >
                <Text
                  style={[styles.modeButtonText, mode === 'add' && styles.modeButtonTextActive]}
                >
                  Add Friend
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'share' ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Your Friend Code</Text>
                  <View style={styles.codeContainer}>
                    {loading ? (
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                    ) : generatedCode ? (
                      <Text style={styles.code}>{generatedCode}</Text>
                    ) : (
                      <Text style={styles.placeholderCode}>••••••••</Text>
                    )}
                  </View>
                  <Text style={styles.infoText}>
                    Share this code with someone to add them as a friend
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleShare}
                  disabled={loading}
                >
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {generatedCode ? 'Share Code' : 'Generate & Share'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Enter Friend Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12345678"
                    placeholderTextColor={theme.colors.border}
                    value={inviteCode}
                    onChangeText={(text) => {
                      // Only allow numeric input
                      const numericText = text.replace(/[^0-9]/g, '');
                      setInviteCode(numericText);
                    }}
                    keyboardType="number-pad"
                    autoCorrect={false}
                    maxLength={8}
                  />
                  <Text style={styles.infoText}>
                    Enter a friend's code to add them to your friends list
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    inviteCode.length === 0 && styles.buttonSecondary,
                    (loading || inviteCode.length !== 8) && styles.buttonDisabled,
                  ]}
                  onPress={handleAddFriend}
                  disabled={loading || inviteCode.length !== 8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Add Friend</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
            </View>
          </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
