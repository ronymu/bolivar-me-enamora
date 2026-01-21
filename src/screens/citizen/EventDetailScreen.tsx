// src/screens/citizen/EventDetailScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  Linking,
  ScrollView,
  StatusBar,
  Alert,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Heart, MapPin, ExternalLink, User2 } from "lucide-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { eventsMock } from "../../mock/events";
import { useFavorites } from "../../context/FavoritesContext";
import type { RootStackParamList } from "../../navigation/AppNavigator";

const COLORS = {
  bg: "#F2F2F2",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.75)",
  border: "rgba(107,100,93,0.22)",
  surface: "#FFFFFF",
  coral: "#FF6969",
  coralSoft: "rgba(255,105,105,0.12)",
};

const SPACING = {
  pageX: 16,
  headerOffsetY: 10,
  bottomPad: 32,
  dotsOffset: 18,
};

type Nav = NativeStackNavigationProp<RootStackParamList, "EventDetail">;
type Route = RouteProp<RootStackParamList, "EventDetail">;

// Campos opcionales “backend-ready” (aún no están en EventMock)
type EventBackendExtras = {
  organizerName?: string;
  organizerOrg?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
};

async function openMapsWithFeedback(address?: string, lat?: number, lng?: number) {
  let url = "https://www.google.com/maps/search/?api=1";
  if (typeof lat === "number" && typeof lng === "number") url += `&query=${lat},${lng}`;
  else if (address) url += `&query=${encodeURIComponent(address)}`;

  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert("No se pudo abrir Maps", "Tu dispositivo no soporta este enlace.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("No se pudo abrir Maps", "Inténtalo de nuevo más tarde.");
  }
}

export default function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  const HERO_H = useMemo(() => Math.round(SCREEN_H * 0.6), [SCREEN_H]);
  const OVERLAP = useMemo(() => Math.round(HERO_H * 0.12), [HERO_H]);

  const { eventId } = route.params;

  const event = useMemo(() => eventsMock.find((e) => e.id === eventId), [eventId]);

  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const liked = event ? isFavorite(event.id) : false;

  const [index, setIndex] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    // fade/slide son refs estables; no hace falta deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const images = useMemo(() => {
    if (!event) return [];
    return (event.images?.length ? event.images : [event.image]).filter(Boolean);
  }, [event]);

  const onHeroMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / (SCREEN_W || 1));
      setIndex(next);
    },
    [SCREEN_W]
  );

  // ✅ Error UI en vez de null
  if (!event) {
    return (
      <View style={[styles.container, styles.errorWrap, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorTitle}>Evento no encontrado</Text>
        <Text style={styles.errorText}>
          Puede que el evento ya no exista o que el enlace esté incompleto.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={navigation.goBack}
          style={({ pressed }) => [styles.errorBtn, pressed ? styles.errorBtnPressed : null]}
        >
          <Text style={styles.errorBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const extra = event as typeof event & EventBackendExtras;

  const organizerName = extra.organizerName ?? "Gestor cultural";
  const organizerOrg = extra.organizerOrg ?? null;
  const address = extra.address ?? event.location ?? "Dirección no disponible";
  const lat = extra.latitude;
  const lng = extra.longitude;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.bottomPad }}
      >
        {/* HERO */}
        <View style={[styles.hero, { height: HERO_H }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroMomentumEnd}
            scrollEventThrottle={16}
            bounces={false}
            // ✅ mejora conflictos de gestos
            nestedScrollEnabled={Platform.OS === "android"}
            directionalLockEnabled={Platform.OS === "ios"}
          >
            {images.map((item, i) => (
              <View key={`${event.id}-img-${i}`} style={[styles.heroSlide, { width: SCREEN_W, height: HERO_H }]}>
                <Image
                  source={item}
                  style={[styles.heroImage, { width: SCREEN_W, height: HERO_H }]}
                  resizeMode="cover"
                  // ✅ ligera transición sin flicker extremo
                  fadeDuration={150}
                  // ✅ Android: mejor memoria/decodificación
                  resizeMethod="resize"
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0.2)", "transparent", "rgba(0,0,0,0.6)"]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View pointerEvents="none" style={[styles.dotsRow, { bottom: OVERLAP + SPACING.dotsOffset }]}>
              {images.map((_, i) => (
                <View key={`${event.id}-dot-${i}`} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </View>
          )}

          <View style={[styles.header, { top: insets.top + SPACING.headerOffsetY, left: SPACING.pageX, right: SPACING.pageX }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              accessibilityHint="Regresa a la pantalla anterior"
              style={({ pressed }) => [styles.iconBtn, pressed ? styles.iconBtnPressed : null]}
              onPress={navigation.goBack}
              hitSlop={10}
            >
              <ArrowLeft size={22} color="white" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={liked ? "Quitar de favoritos" : "Guardar en favoritos"}
              accessibilityHint="Marca este evento como favorito"
              style={({ pressed }) => [styles.iconBtn, pressed ? styles.iconBtnPressed : null]}
              onPress={() => (liked ? removeFavorite(event.id) : addFavorite(event.id))}
              hitSlop={10}
            >
              <Heart
                size={22}
                color={liked ? COLORS.coral : "white"}
                fill={liked ? COLORS.coral : "transparent"}
              />
            </Pressable>
          </View>
        </View>

        {/* CARD */}
        <Animated.View
          style={[
            styles.cardWrap,
            {
              marginTop: -OVERLAP,
              opacity: fade,
              transform: [{ translateY: slide }],
              paddingHorizontal: SPACING.pageX,
            },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{event.title}</Text>

            <View style={styles.meta}>
              <Text style={styles.metaText}>{event.dateLabel}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{event.location}</Text>
            </View>

            <Text style={styles.description}>{event.fullDescription}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Comprar entrada"
              accessibilityHint="Acción no disponible aún"
              style={({ pressed }) => [styles.cta, pressed ? styles.ctaPressed : null]}
              onPress={() => Alert.alert("Próximamente", "La compra de entradas se activará en una próxima versión.")}
            >
              <Text style={styles.ctaText}>Comprar entrada</Text>
            </Pressable>

            <View style={styles.divider} />

            {/* GESTOR */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <User2 size={18} color={COLORS.text} />
                <Text style={styles.blockTitle}>Gestor</Text>
              </View>

              <Text style={styles.blockPrimary}>{organizerName}</Text>
              {organizerOrg ? <Text style={styles.blockSecondary}>{organizerOrg}</Text> : null}
            </View>

            <View style={styles.divider} />

            {/* CÓMO LLEGAR */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <MapPin size={18} color={COLORS.text} />
                <Text style={styles.blockTitle}>Cómo llegar</Text>
              </View>

              <Text style={styles.blockSecondary}>{address}</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir en Maps"
                accessibilityHint="Abre la ubicación del evento en la app de mapas"
                style={({ pressed }) => [styles.mapBtn, pressed ? styles.mapBtnPressed : null]}
                onPress={() => openMapsWithFeedback(address, lat, lng)}
                hitSlop={8}
              >
                <ExternalLink size={14} color={COLORS.text} />
                <Text style={styles.mapBtnText}>Abrir en Maps</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  hero: { backgroundColor: "black" },
  heroSlide: { backgroundColor: "black" },
  heroImage: {},

  header: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.40)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
  },

  cardWrap: { },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  meta: { flexDirection: "row", marginVertical: 12, flexWrap: "wrap" },
  metaText: { color: COLORS.textSoft, fontWeight: "700" },
  metaDot: { marginHorizontal: 8, color: COLORS.textSoft },

  description: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSoft,
    marginBottom: 20,
  },

  cta: {
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaPressed: {
    borderColor: "rgba(107,100,93,0.35)",
    backgroundColor: "rgba(107,100,93,0.04)",
  },
  ctaText: { fontWeight: "900", color: COLORS.text },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  block: { gap: 6 },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  blockTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  blockPrimary: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  blockSecondary: { fontSize: 13, color: COLORS.textSoft },

  mapBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapBtnPressed: {
    borderColor: "rgba(107,100,93,0.35)",
    backgroundColor: "rgba(107,100,93,0.04)",
  },
  mapBtnText: { fontSize: 12, fontWeight: "800", color: COLORS.text },

  // Error UI
  errorWrap: {
    paddingHorizontal: 20,
    justifyContent: "center",
    flex: 1,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSoft,
    textAlign: "center",
    marginBottom: 16,
  },
  errorBtn: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: 18,
  },
  errorBtnPressed: {
    borderColor: "rgba(107,100,93,0.35)",
    backgroundColor: "rgba(107,100,93,0.04)",
  },
  errorBtnText: { fontWeight: "900", color: COLORS.text },
});
