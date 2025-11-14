import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { encodeTripData } from '../utils/tripEncoding';
import { Trip } from '../store/tripStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../i18n/useTranslation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 1000;

interface ShareTripModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
}

export default function ShareTripModal({ visible, onClose, trip }: ShareTripModalProps) {
  const [shareCode, setShareCode] = useState<string | null>(null);
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  const dragY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const handleGenerateCode = () => {
    try {
      console.log('📤 Generating share code for trip:', trip.id, trip.name);
      const code = encodeTripData(trip);
      console.log('✅ Share code generated successfully');
      setShareCode(code);
    } catch (error) {
      console.error('❌ Error generating share code:', error);
      const errorMessage = error instanceof Error ? error.message : t('shareTrip.generateError');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleShare = async () => {
    if (!shareCode) return;
    try {
      await Share.share({
        message: `${trip.name}\n\n${t('shareTrip.shareCodeMessage')}\n\n${shareCode}`,
        title: `${t('shareTrip.share')} ${trip.name}`
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!shareCode) return;
    try {
      await Clipboard.setStringAsync(shareCode);
      Alert.alert(t('common.success'), t('shareTrip.codeCopied'));
    } catch (error) {
      Alert.alert(t('common.error'), t('shareTrip.copyError'));
    }
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
      setShareCode(null);
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
    panel: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.9, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
    dragIndicator: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, flex: 1, textAlign: 'center' },
    closeButton: { padding: 4 },
    content: { padding: 20 },
    tripInfo: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 16, marginBottom: 20 },
    tripName: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
    tripDetails: { fontSize: 14, color: theme.colors.textSecondary },
    infoSection: { marginBottom: 24 },
    infoText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 16 },
    generateButton: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
    generateButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
    codeCard: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 20 },
    codeContainer: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
    codeLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
    codeText: { fontSize: 12, color: theme.colors.text, fontFamily: 'monospace', lineHeight: 18 },
    actionButtons: { flexDirection: 'row', gap: 8 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 10, gap: 8 },
    actionButtonSecondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    actionButtonTextSecondary: { color: theme.colors.text },
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
              <Text style={styles.headerTitle}>{t('shareTrip.title')}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.tripInfo}>
              <Text style={styles.tripName}>{trip.name}</Text>
              <Text style={styles.tripDetails}>{trip.stops.length} {t('tripList.stops')} • {trip.description || t('common.noDescription')}</Text>
            </View>
            {!shareCode ? (
              <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                  {t('shareTrip.codeDescription')}
                </Text>
                <TouchableOpacity style={styles.generateButton} onPress={handleGenerateCode}>
                  <Ionicons name="code-slash" size={24} color="white" />
                  <Text style={styles.generateButtonText}>{t('shareTrip.generateCode')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.codeCard}>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>{t('shareTrip.shareCode')}</Text>
                  <Text style={styles.codeText} selectable>{shareCode}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Ionicons name="share-social" size={20} color="white" />
                    <Text style={styles.actionButtonText}>{t('shareTrip.share')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleCopyCode}>
                    <Ionicons name="copy-outline" size={20} color={theme.colors.text} />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>{t('shareTrip.copy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}
  