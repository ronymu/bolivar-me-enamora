// src/components/SwipeDeck.tsx
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");
const OFFSCREEN_X = W * 1.2;

export type SwipeDirection = "left" | "right";

export type SwipeDeckHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeBack: () => void;
};

type Props<T> = {
  cards: T[];
  renderCard: (card: T, index: number) => React.ReactNode;

  // callbacks
  onSwiped?: (index: number, dir: SwipeDirection) => void;
  onDone?: () => void;

  // config
  stackSize?: number;       // cuántas cartas renderizar (default 3)
  stackSeparation?: number; // px
  stackScale?: number;      // 0..1
  swipeThreshold?: number;  // px
};

type HistoryEntry = { dir: SwipeDirection };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function niceSpring() {
  return withSpring(0, { damping: 18, stiffness: 180, mass: 0.7 });
}

function timingFast(to: number) {
  return withTiming(to, { duration: 180, easing: Easing.out(Easing.cubic) });
}

export const SwipeDeck = forwardRef(<T,>(props: Props<T>, ref: React.Ref<SwipeDeckHandle>) => {
  const {
    cards,
    renderCard,
    onSwiped,
    onDone,
    stackSize = 3,
    stackSeparation = 14,
    stackScale = 0.97,
    swipeThreshold = 110,
  } = props;

  const [index, setIndex] = useState(0);
  const historyRef = useRef<HistoryEntry[]>([]);

  // Shared motion for TOP card only (premium + simple)
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const canUndo = index > 0;

  const current = cards[index];
  const next = cards[index + 1];
  const next2 = cards[index + 2];

  const visibleCards = useMemo(() => {
    const list: Array<{ item: T; idx: number; depth: number }> = [];
    if (current != null) list.push({ item: current, idx: index, depth: 0 });
    if (next != null) list.push({ item: next, idx: index + 1, depth: 1 });
    if (next2 != null && stackSize >= 3) list.push({ item: next2, idx: index + 2, depth: 2 });
    return list;
  }, [current, next, next2, index, stackSize]);

  const commitSwipe = useCallback(
    (dir: SwipeDirection) => {
      // guardar dirección para undo
      historyRef.current.push({ dir });

      setIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= cards.length) {
          // done
          onDone?.();
          return nextIndex;
        }
        return nextIndex;
      });

      onSwiped?.(index, dir);
    },
    [cards.length, index, onDone, onSwiped]
  );

  const animateOut = useCallback(
    (dir: SwipeDirection) => {
      const toX = dir === "right" ? OFFSCREEN_X : -OFFSCREEN_X;

      tx.value = timingFast(toX);
      ty.value = timingFast(ty.value * 0.25);

      // al terminar: reset y avanzar index
      setTimeout(() => {
        tx.value = 0;
        ty.value = 0;
        commitSwipe(dir);
      }, 190);
    },
    [commitSwipe, tx, ty]
  );

  const animateBackToCenter = useCallback(() => {
    tx.value = niceSpring();
    ty.value = niceSpring();
  }, [tx, ty]);

  const swipeLeft = useCallback(() => {
    if (index >= cards.length) return;
    animateOut("left");
  }, [animateOut, cards.length, index]);

  const swipeRight = useCallback(() => {
    if (index >= cards.length) return;
    animateOut("right");
  }, [animateOut, cards.length, index]);

  const swipeBack = useCallback(() => {
    if (!canUndo) return;

    const hist = historyRef.current;
    const last = hist.pop();
    const dir = last?.dir ?? "left";

    // colocamos la carta “entrando” desde el lado opuesto al último swipe
    const fromX = dir === "right" ? OFFSCREEN_X : -OFFSCREEN_X;

    // bajamos index primero
    setIndex((prev) => Math.max(0, prev - 1));

    // animación de regreso
    tx.value = fromX;
    ty.value = 0;
    tx.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [canUndo, tx, ty]);

  useImperativeHandle(ref, () => ({ swipeLeft, swipeRight, swipeBack }), [swipeLeft, swipeRight, swipeBack]);

  const pan = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((e) => {
        tx.value = e.translationX;
        ty.value = e.translationY;
      })
      .onEnd(() => {
        const x = tx.value;
        if (Math.abs(x) > swipeThreshold) {
          const dir: SwipeDirection = x > 0 ? "right" : "left";
          runOnJS(animateOut)(dir);
        } else {
          runOnJS(animateBackToCenter)();
        }
      });
  }, [animateBackToCenter, animateOut, swipeThreshold, tx, ty]);

  // estilos animados para la carta top
  const topStyle = useAnimatedStyle(() => {
    const r = interpolate(tx.value, [-W, 0, W], [-12, 0, 12], Extrapolate.CLAMP);
    return {
      transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${r}deg` }],
    };
  });

  // estilos para stacks (next cards)
  const stackStyle = (depth: number) => {
    const scale = Math.pow(stackScale, depth);
    const translateY = depth * stackSeparation;
    return {
      transform: [{ translateY }, { scale }],
      opacity: depth === 2 ? 0.92 : 1,
    } as const;
  };

  // si ya no hay cartas
  if (index >= cards.length) {
    return <View style={styles.done} />;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Render de fondo -> adelante (la top al final) */}
      {visibleCards
        .slice()
        .reverse()
        .map(({ item, idx, depth }) => {
          const isTop = depth === 0;

          const cardNode = (
            <View key={`card-${idx}`} style={[styles.cardBase, stackStyle(depth)]}>
              {renderCard(item, idx)}
            </View>
          );

          if (!isTop) return cardNode;

          return (
            <GestureDetector key={`card-${idx}`} gesture={pan}>
              <Animated.View style={[styles.cardBase, topStyle]}>
                {renderCard(item, idx)}
              </Animated.View>
            </GestureDetector>
          );
        })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardBase: {
    ...StyleSheet.absoluteFillObject,
  },
  done: {
    flex: 1,
  },
});
