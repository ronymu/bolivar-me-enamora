// src/components/EventCard.tsx
import React, { memo } from "react"; // 👈 Importamos memo
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
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
  eventId: string;
};

const FOOTER_RESERVED_SPACE = 92;
const BASE_PADDING = 16;

function EventCard({ title, description, image, chips, eventId }: Props) {
  const navigation = useNavigation<RootNav<"Discover">>();
  const insets = useSafeAreaInsets();

  const contentPaddingBottom = BASE_PADDING + insets.bottom + FOOTER_RESERVED_SPACE;

  const goToDetail = () => {
    navigation.navigate("EventDetail", { eventId });
  };

  return (
    <Pressable
      style={styles.container}
      onPress={goToDetail}
      accessibilityRole="button"
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
    >
      {/* IMAGEN: fadeDuration={0} es vital */}
      <Image
        source={image}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
      />

      <View pointerEvents="none" style={styles.softOverlay} />

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.00)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.72)"]}
        locations={[0, 0.28, 0.66, 1]}
        style={styles.gradient}
      />

      <View style={[styles.content, { paddingBottom: contentPaddingBottom }]}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>

        <View style={styles.chips}>
          {chips.map((chip, idx) => (
            <View key={`${eventId}-${chip}-${idx}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// ✅ ESTO ES EL CAMBIO CLAVE: memo()
// Evita que la carta #2 se repinte cuando la #1 se mueve.
export default memo(EventCard);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", // Fondo sólido vital para evitar transparencias
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  gradient: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
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
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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