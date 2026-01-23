// src/components/EventCard.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootNav } from "../navigation/navTypes";
import type { MediaSource } from "../types/domain";

type Props = {
  title: string;
  description: string;
  image: MediaSource;
  chips: string[];
  eventId: string; // ✅ ahora es obligatorio
};

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// ✅ Más compacto con el footer (X/♥)
const FOOTER_RESERVED_SPACE = 92;
const BASE_PADDING = 16;

export default function EventCard({
  title,
  description,
  image,
  chips,
  eventId,
}: Props) {
  const navigation = useNavigation<RootNav<"Discover">>();
  const insets = useSafeAreaInsets();

  const contentPaddingBottom =
    BASE_PADDING + insets.bottom + FOOTER_RESERVED_SPACE;

  const goToDetail = () => {
    navigation.navigate("EventDetail", { eventId });
  };

  return (
    <Pressable
      style={styles.container}
      onPress={goToDetail}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle del evento: ${title}`}
      accessibilityHint="Abre la pantalla con la información completa del evento"
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      {/* ✅ Imagen absoluta + sin fade para Android (elimina el flash/glitch) */}
      <Image
        source={image}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
        progressiveRenderingEnabled
      />

      {/* Overlay global MUY suave para estabilizar contraste */}
      <View pointerEvents="none" style={styles.softOverlay} />

      {/* ✅ Gradiente real (suave) — evita líneas/banding por “capas sólidas” */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0,0,0,0.00)",
          "rgba(0,0,0,0.10)",
          "rgba(0,0,0,0.22)",
          "rgba(0,0,0,0.38)",
          "rgba(0,0,0,0.56)",
          "rgba(0,0,0,0.72)",
        ]}
        locations={[0, 0.28, 0.48, 0.66, 0.82, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />

      {/* ✅ “Grain” sutil para romper banding (sin assets) */}
      <View pointerEvents="none" style={styles.grain} />

      {/* CONTENIDO (bajito / más junto al footer) */}
      <View style={[styles.content, { paddingBottom: contentPaddingBottom }]}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        {/* ✅ Chips debajo de la descripción (como estaba antes) */}
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={`${eventId}-${chip}`} style={styles.chip}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: SCREEN_H,
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
    height: SCREEN_H * 0.62,
  },

  // Grain sin imagen: micro-contraste con muy baja opacidad.
  grain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.02)",
    opacity: Platform.OS === "android" ? 0.10 : 0.06,
  },

  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

  description: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginRight: 8,
    marginBottom: 8,
  },

  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
