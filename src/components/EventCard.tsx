// src/components/EventCard.tsx
import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/navTypes";
import type { MediaSource } from "../types/domain";
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

type Nav = NativeStackNavigationProp<RootStackParamList, "Discover">;

function EventCard({ title, description, image, chips, eventId, priority = "normal" }: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const contentPaddingBottom = BASE_PADDING + insets.bottom + FOOTER_RESERVED_SPACE;

  const { mainSource, placeholderSource } = useMemo((): {
    mainSource: ImageSource;
    placeholderSource?: ImageSource;
  } => {
    const originalUri = typeof image === "string" ? image : (image as any)?.uri;

    // Si no es URL de red (o no es string), lo tratamos como asset/local
    if (!originalUri || typeof originalUri !== "string") {
      return { mainSource: image as ImageSource };
    }

    const mainUrl = getOptimizedImageUrl(originalUri, 800);
    const phUrl = getOptimizedImageUrl(originalUri, 50);

    // ✅ Nunca devolvemos { uri: null }
    const safeMain: ImageSource = mainUrl ? { uri: mainUrl } : (image as ImageSource);
    const safePh: ImageSource | undefined = phUrl ? { uri: phUrl } : undefined;

    return { mainSource: safeMain, placeholderSource: safePh };
  }, [image]);

  return (
    <View style={styles.container} accessibilityRole="none">
      {/* Fondo sólido elegante por si falla todo */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#2C2C2C" }]} />

      <Image
        source={mainSource}
        placeholder={placeholderSource}
        placeholderContentFit="cover"
        style={styles.image}
        contentFit="cover"
        transition={250}
        priority={priority}
        cachePolicy="memory-disk"
      />

      <View pointerEvents="none" style={styles.softOverlay} />

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.00)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.28, 0.60, 1]}
        style={styles.gradient}
      />

      {/* ✅ Tap solo en la parte inferior para no pelear con el gesto de swipe */}
      <Pressable
        accessibilityRole="none" // El rol de botón ahora está en el contenedor del gesto
        accessibilityLabel={`Abrir detalle: ${title}`}
        android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        style={[styles.contentTapArea, { paddingBottom: contentPaddingBottom }]}
      >
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.chips}>
          {(chips ?? []).map((chip, idx) => (
            <View key={`${eventId}-${chip}-${idx}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {chip}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

export default memo(EventCard, (prev, next) => prev.eventId === next.eventId && prev.priority === next.priority);

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
  contentTapArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
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
