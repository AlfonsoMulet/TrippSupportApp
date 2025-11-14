import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useThemeStore } from '../store/themeStore';

const { height } = Dimensions.get('window');

export type SlidingPanelPosition = 'minimized' | 'mid' | 'full';

interface SlidingPanelProps {
  children: React.ReactNode;
  position: SlidingPanelPosition;
  onPositionChange: (position: SlidingPanelPosition) => void;
  title: string;
}

export default function SlidingPanel({ 
  children, 
  position, 
  onPositionChange, 
  title 
}: SlidingPanelProps) {
  const { theme } = useThemeStore();
  const translateY = useRef(new Animated.Value(0)).current;
  const gestureTranslation = useRef(0);
  
  // Position calculations from top of screen
  const POSITIONS = {
    full: 60,                // Almost to top (leave space for header)
    mid: height * 0.5,       // 50/50 split
    minimized: height - 135  // Just title visible
  };

  // Initialize position
  useEffect(() => {
    translateY.setValue(POSITIONS[position]);
  }, []);

  // Animate when position prop changes
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: POSITIONS[position],
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [position]);

  const onPanGestureEvent = (event: any) => {
    const { translationY } = event.nativeEvent;
    gestureTranslation.current = translationY;
    
    // Calculate new position
    const startY = POSITIONS[position];
    const newY = startY + translationY;
    
    // Constrain within bounds
    const minY = POSITIONS.full;
    const maxY = POSITIONS.minimized;
    const constrainedY = Math.max(minY, Math.min(maxY, newY));
    
    // Update position smoothly
    translateY.setValue(constrainedY);
  };

  const onPanStateChange = (event: any) => {
    const { state, velocityY } = event.nativeEvent;
    
    if (state === State.END || state === State.CANCELLED) {
      const currentY = POSITIONS[position] + gestureTranslation.current;
      let targetPosition: SlidingPanelPosition = position;
      
      // Determine target position based on velocity and current position
      if (Math.abs(velocityY) > 800) {
        // Fast gesture - use velocity direction
        if (velocityY > 0) {
          // Fast downward swipe
          if (position === 'full') targetPosition = 'mid';
          else if (position === 'mid') targetPosition = 'minimized';
        } else {
          // Fast upward swipe
          if (position === 'minimized') targetPosition = 'mid';
          else if (position === 'mid') targetPosition = 'full';
        }
      } else {
        // Slow drag - snap to nearest position
        const distToFull = Math.abs(currentY - POSITIONS.full);
        const distToMid = Math.abs(currentY - POSITIONS.mid);
        const distToMin = Math.abs(currentY - POSITIONS.minimized);
        
        if (distToFull <= distToMid && distToFull <= distToMin) {
          targetPosition = 'full';
        } else if (distToMid <= distToMin) {
          targetPosition = 'mid';
        } else {
          targetPosition = 'minimized';
        }
      }
      
      // Reset gesture
      gestureTranslation.current = 0;
      
      const targetY = POSITIONS[targetPosition];
      const currentDistance = Math.abs(currentY - targetY);
      
      // For fast flicks, use decay to maintain momentum, then snap at the end
      if (Math.abs(velocityY) > 800) {
        // Start with decay animation to preserve velocity
        const decayAnimation = Animated.decay(translateY, {
          velocity: velocityY / 1000,
          deceleration: 0.9985, // Very slow deceleration (closer to 1 = less deceleration)
          useNativeDriver: true,
        });
        
        // Add a listener to check when we're close to target
        const listenerId = translateY.addListener(({ value }) => {
          const distanceToTarget = Math.abs(value - targetY);
          
          // When within 80px of target, stop decay and snap in
          if (distanceToTarget < 80) {
            translateY.removeListener(listenerId);
            decayAnimation.stop();
            
            // Quick snap to final position
            Animated.spring(translateY, {
              toValue: targetY,
              velocity: 0,
              tension: 200,
              friction: 25,
              useNativeDriver: true,
            }).start();
          }
        });
        
        decayAnimation.start();
      } else {
        // For slow drags, use gentle spring
        Animated.spring(translateY, {
          toValue: targetY,
          velocity: velocityY / 1000,
          tension: 100,
          friction: 20,
          useNativeDriver: true,
        }).start();
      }
      
      // Update position if changed
      if (targetPosition !== position) {
        onPositionChange(targetPosition);
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      width: '100%',
      height: height,
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      // Platform-specific shadows
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 15,
          shadowColor: '#000',
        },
      }),
      zIndex: 1000,
    },
    dragHandle: {
      width: 50,
      height: 4,
      backgroundColor: theme.colors.textSecondary,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
      opacity: 0.7,
    },
    titleArea: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
  });

  return (
    <Animated.View 
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      {/* Draggable area - Handle + Title */}
      <PanGestureHandler
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanStateChange}
        shouldCancelWhenOutside={false}
        // Android optimizations
        enableTrackpadTwoFingerGesture={false} // Android: Disable trackpad gestures
        minPointers={1}
        maxPointers={1}
      >
        <View>
          <View style={styles.dragHandle} />
          <View style={styles.titleArea}>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
      </PanGestureHandler>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
}