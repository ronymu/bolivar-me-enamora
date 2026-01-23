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
import type { RootScreenProps } from "../../navigation/navTypes";
import type { Event } from "../../types/domain";

const { width, height } = Dimensions.get("window");
const HEADER_BTN_SIZE = 44;

type Props = RootScreenProps<"Discover">;

export default function DiscoverScreen({ navigation }: Props) {
  const swiperRef = useRef<Swiper<Event>>(null);
  const insets = useSafeAreaInsets();

  const { events, isLoading } = useEvents();
  const data = useMemo<Event[]>(() => events, [events]);

  const { addFavorite } = useFavorites();

  const [assetsReady, setAssetsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  // Undo MVP (1 paso)
  const lastIndexRef = useRef<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      try {
        const images = data.map((e) => e.image).filter(Boolean);
        await Promise.all(images.map((img) => Asset.fromModule(img).downloadAsync()));
      } finally {
        if (!cancelled) setAssetsReady(true);
      }
    };

    if (data.length > 0) preload();
    else setAssetsReady(false);

    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    // Reset al cambiar dataset (ej: cuando venga backend/paginación)
    setIsDone(false);
    setCardIndex(0);
    lastIndexRef.current = null;
    setCanUndo(false);
  }, [data.length]);

  const handleSwiped = useCallback(
    (index: number) => {
      lastIndexRef.current = index;
      setCanUndo(true);

      const nextIndex = index + 1;
      setCardIndex(nextIndex);

      if (nextIndex >= data.length) setIsDone(true);
    },
    [data.length]
  );

  const handleSwipedRight = useCallback(
    (index: number) => {
      const e = data[index];
      if (e) addFavorite(e.id);
    },
    [data, addFavorite]
  );

  const handleUndo = useCallback(() => {
    const last = lastIndexRef.current;
    if (last == null) return;

    setIsDone(false);
    setCardIndex(last);

    lastIndexRef.current = null;
    setCanUndo(false);

    try {
      // @ts-ignore runtime API
      swiperRef.current?.jumpToCardIndex?.(last);
    } catch {}
  }, []);

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
            accessibilityHint="Abre la bandeja de recordatorios"
          >
            <Bell size={22} color="white" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("MyEvents")}
            hitSlop={12}
            style={styles.pillWrapper}
            accessibilityRole="button"
            accessibilityLabel="Mis eventos"
            accessibilityHint="Abre tu lista de eventos guardados"
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
            accessibilityHint="Abre tu perfil y preferencias"
          >
            <User size={22} color="white" />
          </Pressable>
        </View>

        {/* Loading global de datos */}
        {isLoading ? (
          <View style={styles.loading} accessible accessibilityRole="text" accessibilityLabel="Cargando eventos">
            <ActivityIndicator />
          </View>
        ) : data.length === 0 ? (
          <View style={styles.done} accessible accessibilityRole="text" accessibilityLabel="No hay eventos disponibles">
            <Text style={styles.doneText}>No hay eventos disponibles</Text>
          </View>
        ) : !assetsReady ? (
          <View style={styles.loading} accessible accessibilityRole="text" accessibilityLabel="Cargando imágenes">
            <ActivityIndicator />
          </View>
        ) : isDone ? (
          <View style={styles.done} accessible accessibilityRole="text" accessibilityLabel="No hay más eventos">
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
                cardIndex,
                onSwiped: handleSwiped,
                onSwipedRight: handleSwipedRight,
                infinite: false,
                backgroundColor: "transparent",
                containerStyle: styles.swiperContainer,
                cardStyle: styles.cardStyle,
                stackSize: 2,
                stackSeparation: 14,
                stackScale: 8,
                animateCardOpacity: false,
                animateOverlayLabelsOpacity: false,
                swipeAnimationDuration: 160,
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
        {!isLoading && assetsReady && data.length > 0 && (
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
    textAlign: "center"
  },
});
