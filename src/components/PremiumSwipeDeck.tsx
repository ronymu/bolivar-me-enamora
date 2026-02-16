import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  withSpring,
} from "react-native-reanimated";
import { ActiveCard, ActiveCardRef, SwipeDirection } from "./ActiveCard";

const { width: SCREEN_W } = Dimensions.get('window');

export type PremiumSwipeDeckProps<T> = {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
  stackSize?: number;
  onSwipedLeft?: (index: number) => void;
  onSwipedRight?: (index: number) => void;
  onIndexChange?: (nextIndex: number) => void;
  requestSwipeLeft?: boolean;
  requestSwipeRight?: boolean;
  requestUndo?: boolean;
  onConsumeRequests?: () => void;
};

function PremiumSwipeDeckBase<T extends { id: string | number }>({
  data,
  renderCard,
  stackSize = 3,
  onSwipedLeft,
  onSwipedRight,
  onIndexChange,
  requestSwipeLeft,
  requestSwipeRight,
  requestUndo,
  onConsumeRequests,
}: PremiumSwipeDeckProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  const [index, setIndex] = useState(0);
  const historyRef = useRef<number[]>([]);
  const activeCardRef = useRef<ActiveCardRef>(null);

  // Este valor SOLO sirve para informar a las cartas de fondo.
  // No controla la carta activa directamente.
  const reportedSwipeX = useSharedValue(0);

  useEffect(() => {
    setIndex(0);
    historyRef.current = [];
    onIndexChange?.(0);
    // Reseteamos el reporte al inicio
    reportedSwipeX.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeData.length]);

  const goNext = useCallback((dir: SwipeDirection) => {
    const cur = index;
    if (cur >= safeData.length) return;

    // --- CORRECCIÓN DEL GLITCH ---
    // Eliminamos: swipeX.value = 0;
    // No reseteamos el valor reportado aquí. Dejamos que la transición de React
    // ocurra suavemente. La nueva ActiveCard se montará con su propio x=0 interno.

    historyRef.current.push(cur);
    const next = cur + 1;
    setIndex(next);
    onIndexChange?.(next);

    if (dir === "left") onSwipedLeft?.(cur);
    else onSwipedRight?.(cur);
  }, [index, safeData.length, onIndexChange, onSwipedLeft, onSwipedRight]); // Quitamos swipeX de dependencias

  const doUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev == null) return;
    // En undo sí forzamos el reset visual para que el mazo se acomode
    reportedSwipeX.value = withSpring(0); 
    setIndex(prev);
    onIndexChange?.(prev);
  }, [onIndexChange, reportedSwipeX]);

  useEffect(() => {
    if (!onConsumeRequests) return;
    if (requestSwipeLeft) {
      onConsumeRequests();
      activeCardRef.current?.swipe('left');
    } else if (requestSwipeRight) {
      onConsumeRequests();
      activeCardRef.current?.swipe('right');
    } else if (requestUndo) {
      onConsumeRequests();
      doUndo();
    }
  }, [requestSwipeLeft, requestSwipeRight, requestUndo, onConsumeRequests, doUndo]);

  if (index >= safeData.length) return <View style={styles.fill} />;

  const renderStack = () => {
    const visibleItems = safeData.slice(index, index + stackSize);
    
    return visibleItems.map((item, i) => {
      const isTopCard = i === 0;
      const zIndex = visibleItems.length - i;
      // Usamos item.id para que React sepa que es la misma carta moviéndose
      const key = `card-${item.id}`;

      if (isTopCard) {
        return (
          <View key={key} style={[styles.cardAbs, { zIndex }]}>
            <ActiveCard 
              ref={activeCardRef}
              onSwipeComplete={goNext}
              reportSwipeX={reportedSwipeX} // Pasamos el reportero
            >
              {renderCard(item)}
            </ActiveCard>
          </View>
        );
      }

      return (
        <BackgroundCard 
          key={key} 
          index={i} 
          zIndex={zIndex} 
          swipeX={reportedSwipeX} // Escuchan el reporte
        >
          {renderCard(item)}
        </BackgroundCard>
      );
    }).reverse();
  };

  return (
    <View style={styles.fill} pointerEvents="box-none">
      {renderStack()}
    </View>
  );
}

const BackgroundCard = ({ children, index, zIndex, swipeX }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Usamos el valor reportado para la interpolación
    const progress = interpolate(
      Math.abs(swipeX.value),
      [0, SCREEN_W * 0.6], 
      [0, 1],
      Extrapolation.CLAMP
    );

    const startScale = 1 - (index * 0.04);
    const endScale = 1 - ((index - 1) * 0.04);
    const currentScale = startScale + (endScale - startScale) * progress;

    const startY = index * 16;
    const endY = (index - 1) * 16;
    const currentY = startY + (endY - startY) * progress;

    return {
      // Añadimos withSpring para que si hay algún cambio brusco en el reporte,
      // el fondo lo suavice.
      transform: [
        { scale: withSpring(currentScale) },
        { translateY: withSpring(currentY) }
      ],
    };
  });

  // Usamos una opacidad simple para la tercera carta, sin spring para evitar parpadeos al aparecer
  const opacityStyle = { opacity: index > 2 ? 0 : 1 };

  return (
    <Animated.View style={[styles.cardAbs, { zIndex }, animatedStyle, opacityStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cardAbs: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2, 
  },
});

const PremiumSwipeDeck = memo(PremiumSwipeDeckBase) as typeof PremiumSwipeDeckBase;
export default PremiumSwipeDeck;