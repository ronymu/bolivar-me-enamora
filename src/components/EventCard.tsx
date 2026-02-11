// src/components/EventCard.tsx
import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
// Importante: ImageSource para tipado correcto
import { Image, ImageSource } from "expo-image"; 
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootNav } from "../navigation/navTypes";
import type { MediaSource } from "../types/domain";
// Importamos la utilidad
import { getOptimizedImageUrl } from "../utils/imageUtils";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  title: string;
  description: string;
  image: MediaSource;
  chips: string[];
  eventId: string;
  priority?: "low" | "normal" | "high"; 
};

const FOOTER_RESERVED_SPACE = 92;
const BASE_PADDING = 16;

function EventCard({ title, description, image, chips, eventId, priority = "normal" }: Props) {
  const navigation = useNavigation<RootNav<"Discover">>();
  const insets = useSafeAreaInsets();

  const contentPaddingBottom = BASE_PADDING + insets.bottom + FOOTER_RESERVED_SPACE;

  const goToDetail = () => {
    navigation.navigate("EventDetail", { eventId });
  };

  // 🔥 CÁLCULO DE FUENTES (Memorizado para rendimiento)
  const { mainSource, placeholderSource } = useMemo(() => {
    const originalUri = typeof image === 'string' ? image : (image as any)?.uri;
    
    // Si no es una URL de red (es local), no usamos optimización
    if (!originalUri || typeof originalUri !== 'string') {
      return { mainSource: image as ImageSource, placeholderSource: null };
    }

    return {
      // Imagen HD (800px)
      mainSource: { uri: getOptimizedImageUrl(originalUri, 800) },
      // Imagen Miniatura (50px) - Pesa bytes, carga instantáneo
      placeholderSource: { uri: getOptimizedImageUrl(originalUri, 50) }
    };
  }, [image]);

  return (
    <Pressable
      style={styles.container}
      onPress={goToDetail}
      accessibilityRole="button"
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
    >
      {/* CAPA DE SEGURIDAD:
        Fondo gris oscuro sólido detrás de todo.
        Si la red falla totalmente, se ve gris elegante, nunca negro roto.
      */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2C2C2C' }]} />

      <Image
        source={mainSource}
        // 🔥 MAGIA AQUÍ: Mientras carga la HD, muestra la miniatura borrosa
        placeholder={placeholderSource}
        placeholderContentFit="cover"
        
        style={styles.image}
        contentFit="cover"
        
        // Transición suave (cross-dissolve) entre la miniatura y la HD
        // 250ms es el punto dulce entre "fluido" y "rápido"
        transition={250} 
        
        priority={priority} 
        cachePolicy="memory-disk"
      />

      {/* Overlay sutil para textura */}
      <View pointerEvents="none" style={styles.softOverlay} />

      {/* Gradiente para legibilidad del texto */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.00)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.28, 0.60, 1]}
        style={styles.gradient}
      />

      <View style={[styles.content, { paddingBottom: contentPaddingBottom }]}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.chips}>
          {chips.map((chip, idx) => (
            <View key={`${eventId}-${chip}-${idx}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {chip}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// Optimización: React.memo para evitar re-renderizados si las props no cambian
export default memo(EventCard, (prev, next) => {
  return prev.eventId === next.eventId && prev.priority === next.priority;
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#121212", 
    overflow: "hidden",
    borderRadius: 0,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
    // He eliminado textShadow para mejorar rendimiento (FPS) durante la animación
    // Si los necesitas, descomenta las siguientes líneas con cuidado:
    // textShadowColor: "rgba(0,0,0,0.5)",
    // textShadowOffset: { width: 0, height: 1 },
    // textShadowRadius: 4,
  },
  description: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});