import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const handleEmailSupport = () => {
    const email = 'trippplannerapp.help@gmail.com';
    const subject = 'Trip Planner Support Request';
    const body = `Hi Trip Planner team,\n\nI need help with:\n\n[Please describe your issue]\n\n---\nUser: ${user?.email}\nApp Version: 1.0.0`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (supported) Linking.openURL(mailtoUrl);
        else Alert.alert('Email Address', email, [{ text: 'OK' }]);
      })
      .catch(() => Alert.alert('Email Address', email, [{ text: 'OK' }]));
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 32,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.07,
      shadowRadius: 8,
      elevation: 12,
      zIndex: 10,
      marginHorizontal: -16,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '600' },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    section: { marginBottom: 32 },
    contactCard: { borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1 },
    contactHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    contactInfo: { flex: 1 },
    contactTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
    contactSubtitle: { fontSize: 14 },
    contactDescription: { fontSize: 16, fontWeight: '500', marginBottom: 16 },
    contactButton: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
    contactButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    faqCard: { borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1 },
    faqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    faqTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
    faqSubtitle: { fontSize: 14 },
    faqItem: { marginBottom: 20 },
    faqQuestion: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    faqAnswer: { fontSize: 15, lineHeight: 22 },
    versionInfo: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 0, borderWidth: 1 }, // ✅ removed bottom margin
    versionText: { fontSize: 14 },
  });

  const faqItems = [
    { q: t('helpSupport.howCreateTrip'), a: t('helpSupport.answerCreateTrip') },
    { q: t('helpSupport.howAddStops'), a: t('helpSupport.answerAddStops') },
    { q: t('helpSupport.canShareTrip'), a: t('helpSupport.answerShareTrip') },
    { q: t('helpSupport.howChangeLanguage'), a: t('helpSupport.answerChangeLanguage') },
  ];

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedTheme.colors.background }]}>
      {/* ✅ Disable bottom inset padding */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View style={[styles.header, { backgroundColor: animatedTheme.colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]}>{t('helpSupport.title')}</Animated.Text>
        </Animated.View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }} // ✅ remove scroll bottom padding
        >
          <View style={styles.section}>
            <Animated.View style={[styles.contactCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
              <View style={styles.contactHeader}>
                <Animated.View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="mail-outline" size={28} color={theme.colors.primary} />
                </Animated.View>
                <View style={styles.contactInfo}>
                  <Animated.Text style={[styles.contactTitle, { color: animatedTheme.colors.text }]}>{t('helpSupport.emailSupport')}</Animated.Text>
                  <Animated.Text style={[styles.contactSubtitle, { color: animatedTheme.colors.textSecondary }]}>{t('helpSupport.getHelp')}</Animated.Text>
                </View>
              </View>
              <Animated.Text style={[styles.contactDescription, { color: animatedTheme.colors.text }]}>trippplannerapp.help@gmail.com</Animated.Text>
              <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
                <Text style={styles.contactButtonText}>{t('helpSupport.sendEmail')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.section}>
            <Animated.View style={[styles.faqCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
              <View style={styles.faqHeader}>
                <Animated.View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Ionicons name="help-circle-outline" size={28} color={theme.colors.accent} />
                </Animated.View>
                <View style={styles.contactInfo}>
                  <Animated.Text style={[styles.faqTitle, { color: animatedTheme.colors.text }]}>{t('helpSupport.commonQuestions')}</Animated.Text>
                  <Animated.Text style={[styles.faqSubtitle, { color: animatedTheme.colors.textSecondary }]}>{t('helpSupport.quickAnswers')}</Animated.Text>
                </View>
              </View>
              {faqItems.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                  <Animated.Text style={[styles.faqQuestion, { color: animatedTheme.colors.text }]}>{item.q}</Animated.Text>
                  <Animated.Text style={[styles.faqAnswer, { color: animatedTheme.colors.textSecondary }]}>{item.a}</Animated.Text>
                </View>
              ))}
            </Animated.View>
          </View>

          <Animated.View style={[styles.versionInfo, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
            <Animated.Text style={[styles.versionText, { color: animatedTheme.colors.textTertiary }]}>{t('about.version')}</Animated.Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}
