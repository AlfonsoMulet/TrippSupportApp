import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useAnimatedTheme } from '../contexts/ThemeAnimationContext';
import { useTranslation } from '../i18n/useTranslation';

export default function AboutScreen() {
  const navigation = useNavigation();
  const { theme } = useThemeStore();
  const animatedTheme = useAnimatedTheme();
  const { t } = useTranslation();

  const technologiesUsed = [
    { name: t('about.googleMaps'), icon: 'map-outline', url: 'https://www.google.com/intl/en/help/terms_maps/' },
    { name: t('about.firebase'), icon: 'cloud-outline', url: 'https://firebase.google.com/terms' },
    { name: t('about.reactNative'), icon: 'logo-react', url: 'https://reactnative.dev/' },
    { name: t('about.expo'), icon: 'logo-javascript', url: 'https://expo.dev/' },
    { name: t('about.reactNavigation'), icon: 'navigate-outline', url: 'https://reactnavigation.org/' },
  ];

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
    logoSection: { alignItems: 'center', paddingVertical: 32 },
    logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    appName: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
    version: { fontSize: 16, marginBottom: 4 },
    tagline: { fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    infoCard: { borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1 },
    infoText: { fontSize: 15, lineHeight: 24 },
    techList: { gap: 12 },
    techItem: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
    techIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    techInfo: { flex: 1 },
    techName: { fontSize: 16, fontWeight: '500' },
    supportCard: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
    supportTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    supportEmail: { fontSize: 15, marginBottom: 16 },
    contactButton: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    contactButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    footer: { alignItems: 'center', paddingTop: 24, paddingBottom: 0 }, // ✅ no bottom padding
    footerText: { fontSize: 14, textAlign: 'center' },
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedTheme.colors.background }]}>
      {/* ✅ only respect top safe area, no bottom padding */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View style={[styles.header, { backgroundColor: animatedTheme.colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Animated.Text style={[styles.headerTitle, { color: animatedTheme.colors.text }]}>{t('about.title')}</Animated.Text>
        </Animated.View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }} // ✅ removes bottom space in scroll
        >
          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="map" size={40} color={theme.colors.primary} />
            </Animated.View>
            <Animated.Text style={[styles.appName, { color: animatedTheme.colors.text }]}>{t('about.appName')}</Animated.Text>
            <Animated.Text style={[styles.version, { color: animatedTheme.colors.textSecondary }]}>{t('about.version')}</Animated.Text>
            <Animated.Text style={[styles.tagline, { color: animatedTheme.colors.textSecondary }]}>{t('about.tagline')}</Animated.Text>
          </View>

          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>{t('about.aboutThisApp')}</Animated.Text>
            <Animated.View style={[styles.infoCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
              <Animated.Text style={[styles.infoText, { color: animatedTheme.colors.textSecondary }]}>{t('about.description')}</Animated.Text>
            </Animated.View>
          </View>

          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>{t('about.builtWith')}</Animated.Text>
            <View style={styles.techList}>
              {technologiesUsed.map((tech, index) => (
                <TouchableOpacity key={index} onPress={() => Linking.openURL(tech.url)}>
                  <Animated.View style={[styles.techItem, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
                    <Animated.View style={[styles.techIcon, { backgroundColor: animatedTheme.colors.surface }]}>
                      <Ionicons name={tech.icon as any} size={24} color={theme.colors.textSecondary} />
                    </Animated.View>
                    <View style={styles.techInfo}>
                      <Animated.Text style={[styles.techName, { color: animatedTheme.colors.text }]}>{tech.name}</Animated.Text>
                    </View>
                    <Ionicons name="open-outline" size={20} color={theme.colors.textSecondary} />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Animated.Text style={[styles.sectionTitle, { color: animatedTheme.colors.text }]}>{t('about.legalInfo')}</Animated.Text>
            <Animated.View style={[styles.infoCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
              <Animated.Text style={[styles.infoText, { color: animatedTheme.colors.textSecondary }]}>{t('about.legalNotice')}</Animated.Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.supportCard, { backgroundColor: animatedTheme.colors.card, borderColor: animatedTheme.colors.border }]}>
            <Animated.Text style={[styles.supportTitle, { color: animatedTheme.colors.text }]}>{t('about.needHelp')}</Animated.Text>
            <Animated.Text style={[styles.supportEmail, { color: animatedTheme.colors.textSecondary }]}>trippplannerapp.help@gmail.com</Animated.Text>
            <TouchableOpacity style={styles.contactButton} onPress={() => navigation.navigate('HelpSupport' as never)}>
              <Ionicons name="mail-outline" size={20} color="white" />
              <Text style={styles.contactButtonText}>{t('about.contactSupport')}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Animated.Text style={[styles.footerText, { color: animatedTheme.colors.textTertiary }]}>{t('about.madeWith')}</Animated.Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}
