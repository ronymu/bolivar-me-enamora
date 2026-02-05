// src/screens/citizen/EventDetailScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  Linking,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Heart, MapPin, ExternalLink, User2 } from "lucide-react-native";

import { useFavorites } from "../../context/FavoritesContext";
import { useEvents } from "../../context/EventsContext";
import type { RootScreenProps } from "../../navigation/navTypes";
import { getEventImages, getMapAddress, getMapCoords, getOrganizer } from "../../adapters/eventAdapter";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const HERO_H = Math.round(SCREEN_H * 0.6);

const COLORS = {
  bg: "#F2F2F2",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.75)",
  border: "rgba(107,100,93,0.22)",
  surface: "#FFFFFF",
  coral: "#FF6969",
  coralSoft: "rgba(255,105,105,0.12)",
};

type Props = RootScreenProps<"EventDetail">;

function openMaps(address?: string, lat?: number, lng?: number) {
  let url = "https://www.google.com/maps/search/?api=1";
  if (lat != null && lng != null) url += `&query=${lat},${lng}`;
  else if (address) url += `&query=${encodeURIComponent(address)}`;
  Linking.openURL(url).catch(() => {});
}

export default function EventDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;

  // OJO: esto asume que YA tienes hydrateById implementado en EventsContext.
  // Si no lo tienes, dímelo y te paso el EventsContext completo.
  const { getById, hydrateById, isLoading: isListLoading } = useEvents();
  const [isHydrating, setIsHydrating] = useState(false);

  const event = useMemo(() => getById(eventId), [getById, eventId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setIsHydrating(true);
      try {
        await hydrateById(eventId);
      } finally {
        if (alive) setIsHydrating(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId, hydrateById]);

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
  }, [fade, slide]);

  if (!event && (isListLoading || isHydrating)) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={[styles.errorText, { marginTop: 10 }]}>Cargando evento…</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorTitle}>Evento no encontrado</Text>
        <Text style={styles.errorText}>Vuelve e intenta abrirlo de nuevo.</Text>

        <Pressable
          onPress={navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.errorBtn, pressed ? styles.errorBtnPressed : null]}
        >
          <Text style={styles.errorBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const OVERLAP = Math.round(HERO_H * 0.12);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  const organizer = getOrganizer(event);
  const address = getMapAddress(event);
  const { latitude: lat, longitude: lng } = getMapCoords(event);
  const images = useMemo(() => getEventImages(event), [event]);

  if (__DEV__) {
    console.log("[UI] organizer resolved:", organizer);
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* HERO */}
        <View style={styles.hero} accessible accessibilityLabel={`Galería de imágenes de ${event.title}`}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            keyExtractor={(_, i) => `${event.id}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.heroSlide}>
                <Image source={item} style={styles.heroImage} resizeMode="cover" fadeDuration={0} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.2)", "transparent", "rgba(0,0,0,0.6)"]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>
            )}
          />

          {images.length > 1 && (
            <View pointerEvents="none" style={[styles.dotsRow, { bottom: OVERLAP + 18 }]}>
              {images.map((_, i) => (
                <View key={`${event.id}-dot-${i}`} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </View>
          )}

          <View style={[styles.header, { top: insets.top + 10 }]}>
            <Pressable style={styles.iconBtn} onPress={navigation.goBack} hitSlop={10}>
              <ArrowLeft size={22} color="white" />
            </Pressable>

            <Pressable
              style={styles.iconBtn}
              onPress={() => (liked ? removeFavorite(event.id) : addFavorite(event.id))}
              hitSlop={10}
            >
              <Heart size={22} color={liked ? COLORS.coral : "white"} fill={liked ? COLORS.coral : "transparent"} />
            </Pressable>
          </View>
        </View>

        {/* CARD */}
        <Animated.View
          style={[
            styles.cardWrap,
            { marginTop: -OVERLAP, opacity: fade, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {event.title}
            </Text>

            <View style={styles.meta}>
              <Text style={styles.metaText}>{event.dateLabel}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{event.locationLabel}</Text>
            </View>

            <Text style={styles.description}>{event.fullDescription}</Text>

            <Pressable style={styles.cta} onPress={() => {}}>
              <Text style={styles.ctaText}>Comprar entrada</Text>
            </Pressable>

            <View style={styles.divider} />

            {/* GESTOR */}
            <View style={styles.block} accessible accessibilityLabel="Información del gestor">
              <View style={styles.blockHeader}>
                <User2 size={18} color={COLORS.text} />
                <Text style={styles.blockTitle}>Gestor</Text>
              </View>

              <Text style={styles.blockPrimary}>{organizer.name}</Text>
              {organizer.organization ? (
                <Text style={styles.blockSecondary}>{organizer.organization}</Text>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* COMO LLEGAR */}
            <View style={styles.block} accessible accessibilityLabel="Cómo llegar">
              <View style={styles.blockHeader}>
                <MapPin size={18} color={COLORS.text} />
                <Text style={styles.blockTitle}>Cómo llegar</Text>
              </View>

              {/* ✅ FIX: dirección larga ya no se sale */}
              <Text style={styles.addressText}>{address}</Text>

              <Pressable
                style={styles.mapBtn}
                onPress={() => openMaps(address, lat, lng)}
                accessibilityRole="button"
                accessibilityLabel="Abrir en Maps"
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
  center: { alignItems: "center", justifyContent: "center", padding: 24 },

  errorTitle: { color: COLORS.text, fontWeight: "900", fontSize: 16, textAlign: "center" },
  errorText: { color: COLORS.textSoft, fontWeight: "700", marginTop: 8, textAlign: "center" },
  errorBtn: {
    marginTop: 16,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  errorBtnPressed: { backgroundColor: COLORS.coralSoft, borderColor: "rgba(255,105,105,0.55)" },
  errorBtnText: { color: COLORS.text, fontWeight: "900" },

  hero: { height: HERO_H, backgroundColor: "black" },
  heroSlide: { width: SCREEN_W, height: HERO_H, backgroundColor: "black" },
  heroImage: { width: SCREEN_W, height: HERO_H },

  header: {
    position: "absolute",
    left: 16,
    right: 16,
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

  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    zIndex: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.40)" },
  dotActive: { width: 18, backgroundColor: "rgba(255,255,255,0.92)" },

  cardWrap: { paddingHorizontal: 16 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  meta: { flexDirection: "row", marginVertical: 12 },
  metaText: { color: COLORS.textSoft, fontWeight: "700", flexShrink: 1 },
  metaDot: { marginHorizontal: 8, color: COLORS.textSoft },

  description: { fontSize: 14, lineHeight: 20, color: COLORS.textSoft, marginBottom: 20 },

  cta: {
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaText: { fontWeight: "900", color: COLORS.text },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },

  block: { gap: 6 },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  blockTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  blockPrimary: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  blockSecondary: { fontSize: 13, color: COLORS.textSoft },

  // ✅ FIX: envoltura y shrink para direcciones largas
  addressText: {
    fontSize: 13,
    color: COLORS.textSoft,
    flexWrap: "wrap",
    flexShrink: 1,
    maxWidth: "100%",
  },

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
  mapBtnText: { fontSize: 12, fontWeight: "800", color: COLORS.text },
});
