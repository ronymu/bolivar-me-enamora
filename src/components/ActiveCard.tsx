import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  runOnUI,
  interpolate,
  Easing,
  SharedValue,
  useSharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export type SwipeDirection = 'left' | 'right';

export interface ActiveCardRef {
  swipe: (dir: SwipeDirection) => void;
}

interface ActiveCardProps {
  children: React.ReactNode;
  onSwipeComplete: (direction: SwipeDirection) => void;
  // Nueva prop: solo para reportar la posición al padre
  reportSwipeX: SharedValue<number>;
}

const SNAPPY_CONFIG = {
  mass: 0.6,
  damping: 14,
  stiffness: 100,
  overshootClamping: true,
};

export const ActiveCard = forwardRef<ActiveCardRef, ActiveCardProps>(
  ({ children, onSwipeComplete, reportSwipeX }, ref) => {
    // 1. VOLVEMOS A USAR VALORES INTERNOS para la física de la carta
    const x = useSharedValue(0);
    const y = useSharedValue(0);

    // 2. REACCIÓN: Sincronizamos el valor interno 'x' con el reportero externo
    // Esto es lo que permite que las cartas de atrás se muevan sin causar glitches
    useAnimatedReaction(
      () => x.value,
      (currentX) => {
        reportSwipeX.value = currentX;
      }
    );

    const swipeOut = (direction: SwipeDirection) => {
      'worklet';
      const targetX = direction === 'left' ? -SCREEN_W * 1.5 : SCREEN_W * 1.5;

      x.value = withTiming(
        targetX,
        { duration: 250, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(onSwipeComplete)(direction);
          }
        }
      );
    };

    useImperativeHandle(ref, () => ({
      swipe: (dir: SwipeDirection) => {
        runOnUI(swipeOut)(dir);
      },
    }));

    const gesture = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onUpdate((e) => {
        x.value = e.translationX;
        y.value = e.translationY * 0.15;
      })
      .onEnd((e) => {
        const velocity = Math.abs(e.velocityX);
        if (Math.abs(x.value) > SWIPE_THRESHOLD || velocity > 800) {
          const direction = x.value > 0 ? 'right' : 'left';
          swipeOut(direction);
        } else {
          // Si se cancela, vuelve suavemente
          x.value = withSpring(0, SNAPPY_CONFIG);
          y.value = withSpring(0, SNAPPY_CONFIG);
        }
      });

    const animatedStyle = useAnimatedStyle(() => {
      const rotate = interpolate(x.value, [-SCREEN_W, 0, SCREEN_W], [-8, 0, 8]);
      return {
        transform: [
          { translateX: x.value },
          { translateY: y.value },
          { rotate: `${rotate}deg` },
          { scale: 1 }, 
        ],
      };
    });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    );
  }
);