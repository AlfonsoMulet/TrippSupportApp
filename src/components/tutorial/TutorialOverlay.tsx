/**
 * TutorialOverlay Component
 * 
 * This component provides an interactive tutorial overlay that guides users through the app.
 * 
 * ADAPTIVE TRANSLATION FEATURE:
 * - All tutorial text is fully adaptive to language changes
 * - When the user changes the app language in settings, the tutorial text updates immediately
 * - This is achieved by:
 *   1. Using translation keys (e.g., 'tutorial.welcome.title') instead of hardcoded strings
 *   2. Watching the 'language' variable in useEffect dependencies
 *   3. Re-rendering the overlay with smooth animations when language changes
 * 
 * The tutorial supports all app languages: English, Spanish, German, French, and Italian
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTutorialStore } from '../../store/tutorialStore';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../i18n/useTranslation';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface TutorialOverlayProps {
  currentScreen: 'triplist' | 'tripdetail' | 'map' | 'profile';
  targetRefs: { [key: string]: { x: number; y: number; width: number; height: number } };
}

export default function TutorialOverlay({ currentScreen, targetRefs }: TutorialOverlayProps) {
  const { isActive, currentStep, steps, nextStep, previousStep, skipTutorial } = useTutorialStore();
  const { theme } = useThemeStore();
  const { t, language } = useTranslation();
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [isReady, setIsReady] = useState(false);

  // Adaptive language support: re-render tutorial when language changes
  useEffect(() => {
    if (isActive) {
      // Reset ready state when step changes OR language changes
      // This ensures tutorial text updates immediately when language changes
      setIsReady(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      
      // Wait for measurements to stabilize before showing
      const timer = setTimeout(() => {
        setIsReady(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }, 150);

      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [isActive, currentStep, language]); // Language dependency ensures adaptive translations

  if (!isActive || currentStep >= steps.length || !isReady) return null;

  const currentStepData = steps[currentStep];
  
  // Special case: navigate-to-map action should show on both triplist and map screens
  const shouldShowOnCurrentScreen = 
    currentStepData.screen === currentScreen ||
    currentStepData.screen === 'welcome' ||
    currentStepData.screen === 'complete' ||
    (currentStepData.action === 'navigate-to-map' && currentScreen === 'map');
  
  // Only show tutorial on the correct screen
  if (!shouldShowOnCurrentScreen) {
    return null;
  }

  const targetElement = currentStepData.targetId ? targetRefs[currentStepData.targetId] : null;

  // Handle navigation requirements
  const handleNext = () => {
    const currentStepData = steps[currentStep];
    const nextStepData = steps[currentStep + 1];
    
    // Check if current step requires action
    if (currentStepData.action && currentStepData.action !== 'none') {
      // Don't advance if action is required
      return;
    }
    
    if (nextStepData) {
      // Navigate to the next screen if needed
      if (nextStepData.screen !== currentStepData.screen) {
        switch (nextStepData.screen) {
          case 'triplist':
            (navigation as any).navigate('MainTabs', { screen: 'Trips' });
            break;
          case 'map':
            (navigation as any).navigate('MainTabs', { screen: 'Map' });
            break;
          case 'profile':
            (navigation as any).navigate('MainTabs', { screen: 'Profile' });
            break;
        }
        // Delay step advancement to allow navigation
        setTimeout(() => nextStep(), 600);
      } else {
        nextStep();
      }
    } else {
      nextStep(); // Complete tutorial
    }
  };

  const renderSpotlight = () => {
    if (!targetElement) return null;

    const spotlightPadding = 12;
    const spotlightX = Math.max(0, targetElement.x - spotlightPadding);
    const spotlightY = Math.max(0, targetElement.y - spotlightPadding);
    const spotlightWidth = targetElement.width + spotlightPadding * 2;
    const spotlightHeight = targetElement.height + spotlightPadding * 2;

    return (
      <>
        {/* Semi-transparent overlay AROUND the spotlight - allows clicks through */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Top section */}
          <View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: spotlightY,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
            pointerEvents="auto"
          />
          
          {/* Middle section with hole */}
          <View 
            style={{
              position: 'absolute',
              top: spotlightY,
              left: 0,
              right: 0,
              height: spotlightHeight,
              flexDirection: 'row',
            }}
            pointerEvents="box-none"
          >
            {/* Left */}
            <View 
              style={{
                width: spotlightX,
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
              pointerEvents="auto"
            />
            
            {/* Center hole - NO OVERLAY, allows clicks */}
            <View 
              style={{
                width: spotlightWidth,
                height: '100%',
              }}
              pointerEvents="box-none"
            />
            
            {/* Right */}
            <View 
              style={{
                flex: 1,
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
              pointerEvents="auto"
            />
          </View>
          
          {/* Bottom section */}
          <View 
            style={{
              position: 'absolute',
              top: spotlightY + spotlightHeight,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
            pointerEvents="auto"
          />
        </View>
        
        {/* Animated highlight ring around target */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlightRing,
            {
              left: spotlightX - 4,
              top: spotlightY - 4,
              width: spotlightWidth + 8,
              height: spotlightHeight + 8,
              borderRadius: 20,
              opacity: fadeAnim,
            },
          ]}
        />
        
        {/* Pulsing ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              left: spotlightX,
              top: spotlightY,
              width: spotlightWidth,
              height: spotlightHeight,
              borderRadius: 16,
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.8],
              }),
            },
          ]}
        />
      </>
    );
  };

  const getTooltipPosition = () => {
    const padding = 16;
    const safeAreaTop = 60;
    const safeAreaBottom = 120;

    if (!targetElement) {
      // Center position for steps without targets
      return {
        top: height / 2 - 180,
        left: padding,
        right: padding,
        maxHeight: 360,
      };
    }

    const tooltipMaxHeight = 260;

    if (currentStepData.position === 'top') {
      // Show tooltip above the target
      const bottomPos = height - targetElement.y + padding;
      const availableSpace = height - bottomPos - safeAreaBottom;
      return {
        bottom: Math.max(safeAreaBottom, bottomPos),
        left: padding,
        right: padding,
        maxHeight: Math.min(tooltipMaxHeight, availableSpace),
      };
    } else if (currentStepData.position === 'bottom') {
      // Show tooltip below the target
      const topPos = targetElement.y + targetElement.height + padding;
      const availableSpace = height - topPos - safeAreaBottom;
      return {
        top: Math.max(safeAreaTop, Math.min(topPos, height - tooltipMaxHeight - safeAreaBottom)),
        left: padding,
        right: padding,
        maxHeight: Math.min(tooltipMaxHeight, Math.max(availableSpace, 200)),
      };
    } else {
      // Center
      return {
        top: Math.max(safeAreaTop, height / 2 - 130),
        left: padding,
        right: padding,
        maxHeight: 260,
      };
    }
  };

  const styles = StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
    },
    darkSection: {
      position: 'absolute',
    },
    highlightRing: {
      position: 'absolute',
      borderWidth: 4,
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 12,
      elevation: 10,
    },
    pulseRing: {
      position: 'absolute',
      borderWidth: 3,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '15',
    },
    tooltipContainer: {
      position: 'absolute',
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
    },
    skipButton: {
      padding: 4,
      marginLeft: 8,
    },
    skipText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    description: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      marginBottom: 20,
    },
    footer: {
      flexDirection: 'column',
      gap: 12,
      marginTop: 4,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
    },
    progressDotActive: {
      backgroundColor: theme.colors.primary,
      width: 24,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    buttonTextPrimary: {
      color: '#fff',
    },
    buttonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.5,
    },
    actionHint: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
      marginTop: 8,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });

  const tooltipPosition = getTooltipPosition();
  
  // Show action hint for steps that require user interaction
  const showActionHint = currentStepData.action &&
    currentStepData.action !== 'none';

  // Disable Next button for action-required steps (except navigate-to-map which is informational)
  const isNextDisabled = currentStepData.action &&
    currentStepData.action !== 'none' &&
    currentStepData.action !== 'navigate-to-map';

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Overlay with spotlight cutout */}
      {targetElement ? (
        renderSpotlight()
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} pointerEvents="auto" />
      )}

      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltipContainer,
          tooltipPosition,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>{t(currentStepData.titleKey as any)}</Text>
          <TouchableOpacity style={styles.skipButton} onPress={skipTutorial}>
            <Text style={styles.skipText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>{t(currentStepData.descriptionKey as any)}</Text>

        {showActionHint && (
          <Text style={styles.actionHint}>
            {currentStepData.action === 'tap-trip' && t('tutorial.actionHints.tapTrip')}
            {currentStepData.action === 'wait-for-stop' && t('tutorial.actionHints.addStop')}
            {currentStepData.action === 'navigate-to-map' && t('tutorial.actionHints.tapMapTab')}
          </Text>
        )}

        <View style={styles.footer} pointerEvents="box-none">
          {/* Progress dots */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.button} onPress={previousStep}>
                <Text style={styles.buttonText}>{t('tutorial.navigation.back')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, isNextDisabled && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={isNextDisabled}
            >
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                {currentStepData.buttonText === 'ok' 
                  ? 'OK'
                  : currentStep === steps.length - 1 
                    ? t('tutorial.navigation.finish') 
                    : t('tutorial.navigation.next')
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
