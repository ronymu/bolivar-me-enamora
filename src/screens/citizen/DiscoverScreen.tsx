// src/screens/citizen/DiscoverScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Text,
  StatusBar,
  Image,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import { Asset } from "expo-asset";
import { Bell, User } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EventCard from "../../components/EventCard";
import SwipeFooter from "../../components/SwipeFooter";
import { useFavorites } from "../../context/FavoritesContext";
import { useEvents } from "../../context/EventsContext";
import { useSeenEvents } from "../../hooks/useSeenEvents";
import { useAuth } from "../../context/AuthContext";
import type { RootScreenProps } from "../../navigation/navTypes";
import type { Event } from "../../types/domain";
import type { ImageSourcePropType } from "react-native";

const { width, height } = Dimensions.get("window");
const HEADER_BTN_SIZE = 44;

// ✅ Dev: para que “vistos” no te esconda todo mientras pruebas
const IS_DEV_SHOW_ALL_SEEN = true;

type Props = RootScreenProps<"Discover">;

function isRemoteUriSource(src: ImageSourcePropType): src is { uri: string } {
  return (
    !!src &&
    typeof src === "object" &&
    "uri" in (src as any) &&
    typeof (src as any).uri === "string" &&
    (src as any).uri.trim().length > 0
  );
}

function isHttpUrl(uri: string) {
  const u = uri.trim().toLowerCase();
  return u.startsWith("http://") || u.startsWith("https://");
}

export default function DiscoverScreen({ navigation }: Props) {
  const swiperRef = useRef<Swiper<Event>>(null);
  const insets = useSafeAreaInsets();

  const { events, isLoading, error, refresh } = useEvents();
  const { addFavorite } = useFavorites();
  const { user } = useAuth();
  const { seenIds, isLoaded: seenLoaded, markAsSeen } = useSeenEvents(user?.id ?? "guest");

  const data = useMemo<Event[]>(() => {
    const list = Array.isArray(events) ? events : [];
    if (IS_DEV_SHOW_ALL_SEEN) return list;
    return list.filter((e) => !seenIds.includes(e.id));
  }, [events, seenIds]);

  const [assetsReady, setAssetsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Undo MVP (1 paso)
  const lastIndexRef = useRef<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // Preload imágenes (como ya lo tenías)
  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      try {
        const images = data.map((e) => e.image).filter(Boolean) as ImageSourcePropType[];

        await Promise.all(
          images.map(async (img) => {
            try {
              if (typeof img === "number") {
                await Asset.fromModule(img).downloadAsync();
                return;
              }

              if (isRemoteUriSource(img)) {
                const uri = img.uri.trim();
                if (isHttpUrl(uri)) await Image.prefetch(uri);
              }
            } catch {
              // ignore
            }
          })
        );
      } finally {
        if (!cancelled) setAssetsReady(true);
      }
    };

    if (data.length > 0) {
      setAssetsReady(false);
      preload();
    } else {
      setAssetsReady(false);
    }

    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    // Reset al cambiar dataset
    setIsDone(false);
    lastIndexRef.current = null;
    setCanUndo(false);

    // Importante: cuando cambia data, el Swiper se re-renderiza con cards nuevas.
    // NO controlamos cardIndex para evitar “salto” inicial.
  }, [data.length]);

  const handleSwiped = useCallback(
    (index: number) => {
      // ✅ Fix de glitch: diferimos al siguiente frame para no pelear con la animación del Swiper
      requestAnimationFrame(() => {
        const ev = data[index];
        if (ev) {
          markAsSeen(ev.id);
          lastIndexRef.current = index;
          setCanUndo(true);
        }

        const nextIndex = index + 1;
        if (nextIndex >= data.length) setIsDone(true);
      });
    },
    [data, markAsSeen]
  );

  const handleSwipedRight = useCallback(
    (index: number) => {
      const e = data[index];
      if (e) addFavorite(e.id);
    },
    [data, addFavorite]
  );

  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    setIsDone(false);
    setCanUndo(false);
    lastIndexRef.current = null;

    try {
      // ✅ API real del Swiper
      // @ts-ignore
      swiperRef.current?.swipeBack?.();
    } catch {}
  }, [canUndo]);

  const renderCard = useCallback((event?: Event) => {
    if (!event) return null;
    return (
      <EventCard
        title={event.title}
        description={event.description}
        image={event.image}
        chips={event.chips}
        eventId={event.id}
      />
    );
  }, []);

  const showFooter = !isLoading && !error && assetsReady && data.length > 0 && !isDone;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.fullscreen} accessible={false}>
        {/* HEADER */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            style={styles.iconBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Bell size={22} color="white" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("MyEvents")}
            hitSlop={12}
            style={styles.pillWrapper}
            accessibilityRole="button"
            accessibilityLabel="Mis eventos"
          >
            <BlurView intensity={35} tint="dark" style={styles.pill}>
              <Text style={styles.pillText}>Mis eventos</Text>
            </BlurView>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Profile")}
            style={styles.iconBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Perfil"
          >
            <User size={22} color="white" />
          </Pressable>
        </View>

        {/* Loading global */}
        {isLoading || !seenLoaded ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={styles.done}>
            <Text style={styles.doneText}>No se pudieron cargar los eventos</Text>
            <Text style={styles.doneHint}>{error}</Text>

            <Pressable onPress={refresh} style={styles.retryBtn} accessibilityRole="button">
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.done}>
            <Text style={styles.doneText}>No hay eventos disponibles</Text>
          </View>
        ) : !assetsReady ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : isDone ? (
          <View style={styles.done}>
            <Text style={styles.doneText}>No hay más eventos</Text>
            {canUndo ? <Text style={styles.doneHint}>Puedes deshacer el último swipe.</Text> : null}
          </View>
        ) : (
          <View style={styles.swiperWrap} renderToHardwareTextureAndroid>
            <Swiper
              {...({
                ref: swiperRef,
                cards: data,
                renderCard,
                // ✅ CLAVE: NO pasamos cardIndex
                onSwiped: handleSwiped,
                onSwipedRight: handleSwipedRight,
                infinite: false,
                backgroundColor: "transparent",
                containerStyle: styles.swiperContainer,
                cardStyle: styles.cardStyle,
                stackSize: 3,
                stackSeparation: 14,
                stackScale: 8,
                animateCardOpacity: false,
                animateOverlayLabelsOpacity: false,
                swipeAnimationDuration: 200,
                removeClippedSubviews: false,
                disableTopSwipe: true,
                disableBottomSwipe: true,
                verticalSwipe: false,
                cardVerticalMargin: 0,
                cardHorizontalMargin: 0,
                useViewOverflow: Platform.OS === "ios",
              } as any)}
            />
          </View>
        )}

        {/* FOOTER */}
        {showFooter && (
          <View pointerEvents="box-none" style={[styles.footerOverlay, { bottom: insets.bottom + 2 }]}>
            <SwipeFooter
              onUndo={handleUndo}
              canUndo={canUndo}
              onNope={() => swiperRef.current?.swipeLeft()}
              onLike={() => swiperRef.current?.swipeRight()}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  fullscreen: { flex: 1, backgroundColor: "transparent" },

  header: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconBtn: {
    width: HEADER_BTN_SIZE,
    height: HEADER_BTN_SIZE,
    borderRadius: HEADER_BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  pillWrapper: { height: HEADER_BTN_SIZE, borderRadius: HEADER_BTN_SIZE / 2, overflow: "hidden" },
  pill: {
    height: HEADER_BTN_SIZE,
    paddingHorizontal: 18,
    borderRadius: HEADER_BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pillText: { color: "white", fontSize: 14, fontWeight: "600" },

  swiperWrap: { flex: 1, zIndex: 10, backgroundColor: "transparent" },
  swiperContainer: { flex: 1, backgroundColor: "transparent" },
  cardStyle: { width, height, backgroundColor: "transparent" },

  footerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: "center",
  },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  doneText: { color: "white", fontSize: 18, fontWeight: "800", textAlign: "center" },
  doneHint: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 14,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  retryBtnText: { color: "white", fontSize: 14, fontWeight: "800" },
});
