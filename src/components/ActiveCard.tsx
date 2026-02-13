import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  runOnUI,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export type SwipeDirection = 'left' | 'right';

export interface ActiveCardRef {
  swipe: (dir: SwipeDirection) => void;
}

type Props = {
  children: React.ReactNode;
  onSwipeComplete: (direction: SwipeDirection) => void;
  // Eliminamos dragOffset de las props
};

export const ActiveCard = forwardRef<ActiveCardRef, Props>(
  ({ children, onSwipeComplete }, ref) => {
    const x = useSharedValue(0);
    const y = useSharedValue(0);

    const swipeOut = (direction: SwipeDirection) => {
      'worklet';
      const targetX = direction === 'left' ? -SCREEN_W * 1.5 : SCREEN_W * 1.5;

      x.value = withTiming(
        targetX,
        {
          duration: 220,
          easing: Easing.out(Easing.quad),
        },
        (finished) => {
          if (finished) {
            runOnJS(onSwipeComplete)(direction);
          }
        }
      );
    };

    useImperativeHandle(ref, () => ({
      swipe: (dir) => {
        runOnUI(swipeOut)(dir);
      },
    }));

    const gesture = Gesture.Pan()
      .activeOffsetX([-10, 10]) 
      .onUpdate((e) => {
        x.value = e.translationX;
        y.value = e.translationY * 0.15;
        // YA NO actualizamos dragOffset aquí. El fondo es ignorante del gesto.
      })
      .onEnd((e) => {
        if (Math.abs(x.value) > SWIPE_THRESHOLD) {
          const direction = x.value > 0 ? 'right' : 'left';
          const velocity = Math.abs(e.velocityX);
          
          if (velocity > 800 || Math.abs(x.value) > SWIPE_THRESHOLD) {
             swipeOut(direction);
          } else {
             x.value = withSpring(0, { damping: 15, stiffness: 100 });
             y.value = withSpring(0);
          }
        } else {
          x.value = withSpring(0, { damping: 18, stiffness: 120 });
          y.value = withSpring(0);
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