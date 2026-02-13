import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  runOnUI,
  withSpring,
} from "react-native-reanimated";
import { ActiveCard, ActiveCardRef, SwipeDirection } from "./ActiveCard";

type Props<T> = {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
  
  // Configuración visual
  stackSize?: number;
  swipeThreshold?: number;

  // Callbacks
  onSwipedLeft?: (index: number) => void;
  onSwipedRight?: (index: number) => void;
  onIndexChange?: (nextIndex: number) => void;

  // Control externo (Botones)
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
}: Props<T>) {
  const safeData = Array.isArray(data) ? data : [];
  
  // Estado local para el índice actual
  const [index, setIndex] = useState(0);
  
  // Historial para deshacer
  const historyRef = useRef<number[]>([]);
  
  // Ref para controlar la tarjeta activa imperativamente (botones)
  const activeCardRef = useRef<ActiveCardRef>(null);

  // Valor compartido: Progreso del arrastre (X) de la tarjeta activa.
  // Las cartas del fondo escuchan este valor para moverse hacia el frente.
  const dragOffset = useSharedValue(0);

  // Reset completo si cambia la lista de datos base
  useEffect(() => {
    setIndex(0);
    historyRef.current = [];
    dragOffset.value = 0;
    onIndexChange?.(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeData.length]);

  const goNext = useCallback(
    (dir: SwipeDirection) => {
      const cur = index;
      if (cur >= safeData.length) return;

      historyRef.current.push(cur);
      const next = cur + 1;

      // 1. Actualizamos estado React (Desmonta ActiveCard vieja, monta nueva)
      setIndex(next);
      onIndexChange?.(next);

      // 2. Reseteamos visualmente el offset del fondo INSTANTÁNEAMENTE.
      // Al cambiar el index, la carta que era "Fondo 1" pasa a ser "Activa" (pos 0).
      // Como "Fondo 1" ya estaba visualmente en pos 0 gracias a la animación,
      // el cambio es invisible al ojo humano.
      runOnUI(() => {
        dragOffset.value = 0; 
      })();

      if (dir === "left") onSwipedLeft?.(cur);
      else onSwipedRight?.(cur);
    },
    [index, safeData.length, onIndexChange, onSwipedLeft, onSwipedRight]
  );

  const doUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev == null) return;
    
    setIndex(prev);
    onIndexChange?.(prev);
    dragOffset.value = 0;
  }, [onIndexChange]);

  // Manejador de requests externos (Botonera Footer)
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
    // Tomamos solo las cartas necesarias para el stack visual
    const visibleItems = safeData.slice(index, index + stackSize);
    
    return visibleItems.map((item, i) => {
      const isTopCard = i === 0;
      const zIndex = visibleItems.length - i;
      
      // KEY ESTABLE: Crucial para que React no recicle componentes incorrectamente
      const key = `card-${(item as any).id}`;

      if (isTopCard) {
        return (
          <View key={key} style={[styles.cardAbs, { zIndex }]}>
            <ActiveCard 
              ref={activeCardRef}
              onSwipeComplete={goNext}
              dragOffset={dragOffset}
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
          dragOffset={dragOffset}
        >
          {renderCard(item)}
        </BackgroundCard>
      );
    }).reverse(); // Renderizamos de atrás hacia adelante para el Z-Index correcto
  };

  return (
    <View style={styles.fill} pointerEvents="box-none">
      {renderStack()}
    </View>
  );
}

// ✨ COMPONENTE DE FONDO OPTIMIZADO (Sin useEffects / Sin rebotes)
// Se mueve puramente basado en la física del dedo del usuario.
const BackgroundCard = ({ children, index, zIndex, dragOffset }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Rango de interpolación: 0 (reposo) -> 1 (tarjeta activa casi fuera)
    // Usamos un rango de entrada mayor (width * 0.5) para que el fondo se mueva
    // un poco más lento que el dedo, dando sensación de peso.
    const progress = interpolate(
      Math.abs(dragOffset.value),
      [0, 200], 
      [0, 1], 
      'clamp'
    );

    // Configuración de la pila (Stack)
    // index 1: Carta justo debajo de la activa
    // index 2: Carta al fondo
    
    // ESCALA: Crece ligeramente al avanzar
    const startScale = 1 - (index * 0.04);       // Ej: 0.96
    const endScale = 1 - ((index - 1) * 0.04);   // Ej: 1.00
    
    // POSICIÓN Y: Sube para ocupar el lugar vacío
    const spacing = 16;
    const startY = index * spacing;              // Ej: 16px
    const endY = (index - 1) * spacing;          // Ej: 0px

    // Interpolación lineal directa
    const scale = startScale + (progress * (endScale - startScale));
    const translateY = startY - (progress * (startY - endY));

    // Opacidad para ocultar cartas muy profundas
    const opacity = interpolate(index, [1, 2, 3], [1, 1, 0]);

    return {
      opacity,
      transform: [
        { scale },
        { translateY }
      ],
    };
  });

  return (
    <Animated.View style={[styles.cardAbs, { zIndex }, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cardAbs: {
    ...StyleSheet.absoluteFillObject,
    // Sombra sutil estática para separar las capas visualmente
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2, 
  },
});

export default memo(PremiumSwipeDeckBase) as typeof PremiumSwipeDeckBase;