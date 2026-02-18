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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export type SwipeDirection = 'left' | 'right';

export interface ActiveCardRef {
  swipe: (dir: SwipeDirection) => void;
  resetPosition: () => void;
}

interface ActiveCardProps {
  children: React.ReactNode;
  onSwipeComplete: (direction: SwipeDirection) => void;
  // Nueva prop: solo para reportar la posición al padre
  reportSwipeX: SharedValue<number>;
  onSwipeUp?: () => void;
}

const SNAPPY_CONFIG = {
  mass: 0.6,
  damping: 14,
  stiffness: 100,
  overshootClamping: true,
};

export const ActiveCard = forwardRef<ActiveCardRef, ActiveCardProps>(
  ({ children, onSwipeComplete, reportSwipeX, onSwipeUp }, ref) => {
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

    const resetPosition = () => {
      'worklet';
      x.value = withSpring(0, SNAPPY_CONFIG);
      y.value = withSpring(0, SNAPPY_CONFIG);
    };

    useImperativeHandle(ref, () => ({
      swipe: (dir: SwipeDirection) => {
        runOnUI(swipeOut)(dir);
      },
      resetPosition: () => {
        runOnUI(resetPosition)();
      },
    }));

    const flyUpAndTrigger = () => {
      'worklet';
      // Anima la tarjeta para que "vuele" hacia arriba
      y.value = withTiming(-SCREEN_H * 0.6, { duration: 250, easing: Easing.in(Easing.quad) });
      x.value = withTiming(0, { duration: 250 }); // Asegura que vaya recto

      if (onSwipeUp) runOnJS(onSwipeUp)();
    };

    const pan = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .activeOffsetY([-10, 10])
      .onUpdate((e) => {
        // Si el gesto es principalmente vertical hacia arriba, priorízalo
        if (e.translationY < -15 && Math.abs(e.translationY) > Math.abs(e.translationX)) {
          x.value = e.translationX * 0.3; // Amortiguar movimiento horizontal
          y.value = e.translationY;
        } else {
          x.value = e.translationX;
          y.value = e.translationY * 0.2; // Amortiguar movimiento vertical en swipe horizontal
        }
      })
      .onEnd((e) => {
        // Prioridad 1: Gesto de swipe hacia arriba para ver detalle
        if (e.translationY < -80 && e.velocityY < -500) {
          flyUpAndTrigger();
          return; // Detiene el procesamiento posterior
        }

        // Prioridad 2: Gesto de swipe horizontal
        const velocity = Math.abs(e.velocityX);
        if (Math.abs(x.value) > SWIPE_THRESHOLD || velocity > 800) {
          const direction = x.value > 0 ? 'right' : 'left';
          swipeOut(direction);
        } else {
          // Prioridad 3: Si se cancela, vuelve suavemente
          resetPosition();
        }
      });

    const tap = Gesture.Tap().onEnd(() => {
      flyUpAndTrigger();
    });

    // Combina Pan y Tap. Si el Pan se activa, el Tap se cancela.
    // Esto permite tener "tap to open" en toda la tarjeta sin conflictos.
    const composedGesture = Gesture.Exclusive(pan, tap);

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
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    );
  }
);