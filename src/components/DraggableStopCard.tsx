import React, { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Stop } from '../store/tripStore';
import StopCard from './StopCard';

interface DraggableStopCardProps {
  stop: Stop;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart?: (index: number) => void;
  onDrag?: (index: number, absoluteY: number, translationY: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  isDragging?: boolean;
  scrollCompensationRef?: React.MutableRefObject<number>;
  lastTranslationRef?: React.MutableRefObject<number>;
  animatedPosition?: Animated.Value;
  onLayout?: (index: number, y: number, height: number) => void;
}

export default function DraggableStopCard({
  stop,
  index,
  onDelete,
  onEdit,
  onDragStart,
  onDrag,
  onDragEnd,
  isDragging = false,
  scrollCompensationRef,
  lastTranslationRef,
  animatedPosition,
  onLayout,
}: DraggableStopCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowOpacityAnim = useRef(new Animated.Value(0.1)).current;
  const shadowRadiusAnim = useRef(new Animated.Value(4)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Drag state
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  // Combine drag position and slide-aside position
  const combinedTranslateY = React.useMemo(() => {
    return Animated.add(
      translateY,
      animatedPosition || new Animated.Value(0)
    );
  }, [translateY, animatedPosition]);

  // Safeguard: Reset card state if isDragging becomes false
  React.useEffect(() => {
    if (!isDragging && isPressed) {
      setIsPressed(false);
      translateY.setValue(0);
      scaleAnim.setValue(1);
      shadowOpacityAnim.setValue(0.1);
      shadowRadiusAnim.setValue(4);
    }
  }, [isDragging, isPressed, translateY, scaleAnim, shadowOpacityAnim, shadowRadiusAnim]);

  // Continuous animation loop to update position during drag
  React.useEffect(() => {
    if (isPressed) {
      const updatePosition = () => {
        const translation = lastTranslationRef?.current || 0;
        const compensation = scrollCompensationRef?.current || 0;
        translateY.setValue(translation + compensation);
        animationFrameId.current = requestAnimationFrame(updatePosition);
      };

      animationFrameId.current = requestAnimationFrame(updatePosition);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isPressed, translateY, lastTranslationRef, scrollCompensationRef]);

  const onPanGestureEvent = (event: any) => {
    const { translationY, absoluteY } = event.nativeEvent;

    if (isPressed) {
      currentTranslateY.current = translationY;

      if (onDrag) {
        onDrag(index, absoluteY, translationY);
      }
    }
  };

  const onPanStateChange = (event: any) => {
    const { state, absoluteY } = event.nativeEvent;

    if (state === State.BEGAN) {
      setIsPressed(true);
      dragStartY.current = absoluteY;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      if (onDragStart) {
        onDragStart(index);
      }

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(shadowOpacityAnim, {
          toValue: 0.4,
          useNativeDriver: false,
        }),
        Animated.spring(shadowRadiusAnim, {
          toValue: 20,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (state === State.END || state === State.CANCELLED) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      translateY.setValue(0);
      currentTranslateY.current = 0;

      scaleAnim.setValue(1);
      shadowOpacityAnim.setValue(0.1);
      shadowRadiusAnim.setValue(4);

      setIsPressed(false);

      if (onDragEnd) {
        onDragEnd(index, index);
      }
    }
  };

  const containerRef = useRef<any>(null);

  React.useEffect(() => {
    if (containerRef.current && onLayout) {
      containerRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        onLayout(index, pageY, height);
      });
    }
  }, [index, onLayout]);

  return (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanStateChange}
      minDist={10}
      enabled={true}
    >
      <Animated.View
        ref={containerRef}
        style={{
          transform: [
            { translateY: combinedTranslateY },
            { scale: scaleAnim }
          ],
          zIndex: isPressed || isDragging ? 10000 : 1,
          elevation: isPressed || isDragging ? 10000 : 1,
          shadowOpacity: shadowOpacityAnim,
          shadowRadius: shadowRadiusAnim,
          shadowOffset: {
            width: 0,
            height: shadowRadiusAnim.interpolate({
              inputRange: [4, 20],
              outputRange: [2, 10],
            }),
          },
        }}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          containerRef.current?.measure((x: number, y: number, width: number, h: number, pageX: number, pageY: number) => {
            onLayout?.(index, pageY, height);
          });
        }}
      >
        <StopCard
          stop={stop}
          index={index}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      </Animated.View>
    </PanGestureHandler>
  );
}
