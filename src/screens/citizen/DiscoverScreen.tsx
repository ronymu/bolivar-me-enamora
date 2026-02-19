// src/screens/citizen/DiscoverScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { StyleSheet, View, ActivityIndicator, Pressable, Text, StatusBar } from "react-native";
import { Image } from "expo-image";
import { Bell, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import EventCard from "../../components/EventCard";
import SwipeFooter from "../../components/SwipeFooter";
import PremiumSwipeDeck, { PremiumSwipeDeckRef } from "../../components/PremiumSwipeDeck";

import { useEvents } from "../../context/EventsContext";
import { useSeenEvents } from "../../hooks/useSeenEvents";
import { useFavorites } from "../../context/FavoritesContext";
import { useAuth } from "../../context/AuthContext";
import { getOptimizedImageUrl } from "../../utils/imageUtils";
import { resolveSignedUrl } from "../../lib/mediaSigner"; // ✅ Importado
import type { RootScreenProps } from "../../navigation/navTypes";
import type { Event } from "../../types/domain";

const HEADER_BTN_SIZE = 44;
const IS_DEV_SHOW_ALL_SEEN = true;
const CARD_IMAGE_WIDTH = 800;

type Props = RootScreenProps<"Discover">;

export default function DiscoverScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { events, isLoading, error } = useEvents();
  const { addFavorite } = useFavorites();
  const { user, profile } = useAuth(); // ✅ Extraemos profile también
  const { seenIds, isLoaded: seenLoaded, markAsSeen } = useSeenEvents(user?.id ?? "guest");
  const deckRef = useRef<PremiumSwipeDeckRef>(null);

  // ✅ Estado para el avatar firmado
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);

  const data = useMemo<Event[]>(() => {
    const list = Array.isArray(events) ? events : [];
    if (IS_DEV_SHOW_ALL_SEEN) return list;
    if (!seenLoaded) return [];
    return list.filter((e) => !!e?.id && !seenIds.includes(e.id));
  }, [events, seenIds, seenLoaded]);

  const [deckVisible, setDeckVisible] = useState(false);
  const [prefetchUrls, setPrefetchUrls] = useState<string[]>([]);

  // Índice actual (solo UI)
  const [currentIndex, setCurrentIndex] = useState(0);

  // flags para acciones del footer
  const [reqLeft, setReqLeft] = useState(false);
  const [reqRight, setReqRight] = useState(false);
  const [reqUndo, setReqUndo] = useState(false);

  // ✅ Efecto para firmar el avatar cuando cambie el perfil
  useEffect(() => {
    let alive = true;
    if (profile?.avatar_url) {
      resolveSignedUrl(profile.avatar_url, 3600, { bucket: "avatars", retryOnce: true })
        .then((url) => {
          if (alive) setSignedAvatar(url);
        })
        .catch(() => {
          if (alive) setSignedAvatar(null);
        });
    } else {
      setSignedAvatar(null);
    }
    return () => { alive = false; };
  }, [profile?.avatar_url]);

  const extractUrl = (event: Event | undefined) => {
    if (!event) return null;
    if (typeof event.image === "string") return event.image;
    if (typeof event.image === "object" && event.image && "uri" in event.image) return (event.image as any).uri;
    return null;
  };

  const computePrefetch = useCallback(
    (startIndex: number) => {
      const urls = data
        .slice(startIndex, startIndex + 6)
        .map((e) => getOptimizedImageUrl(extractUrl(e), CARD_IMAGE_WIDTH))
        .filter((u): u is string => typeof u === "string" && u.length > 0);

      setPrefetchUrls(urls);
    },
    [data]
  );

  useEffect(() => {
    if (data.length > 0) {
      const t = setTimeout(() => setDeckVisible(true), 30);
      setCurrentIndex(0);
      computePrefetch(0);
      return () => clearTimeout(t);
    }
    setDeckVisible(false);
    setCurrentIndex(0);
    setPrefetchUrls([]);
  }, [data, computePrefetch]);

  const onSwiped = useCallback(
    (idx: number, dir: "left" | "right") => {
      const ev = data[idx];

      if (ev && !IS_DEV_SHOW_ALL_SEEN) markAsSeen(ev.id);
      if (dir === "right" && ev) addFavorite(ev.id);

      const nextIndex = idx + 1;
      setCurrentIndex(nextIndex);
      computePrefetch(nextIndex);
    },
    [addFavorite, data, markAsSeen, computePrefetch]
  );

  const handleSwipeUp = useCallback(
    (cardIndex: number) => {
      const event = data[cardIndex];
      if (event) {
        navigation.navigate("EventDetail", { eventId: event.id });
      }
    },
    [data, navigation]
  );

  useFocusEffect(
    useCallback(() => {
      // Cuando la pantalla vuelve a tener foco (ej. al volver de Detail), resetea la posición de la tarjeta.
      deckRef.current?.resetActiveCard();
    }, [])
  );

  const showFooter = !isLoading && !error && deckVisible && currentIndex < data.length;

  return (
    <LinearGradient
      colors={["#2C2C2C", "#000000"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Ghost Preloader */}
      <View style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}>
        {prefetchUrls.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={{ width: 1, height: 1 }}
            cachePolicy="memory-disk"
            priority="low"
          />
        ))}
      </View>

      <View style={styles.fullscreen}>
        {/* HEADER */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.iconBtn}>
            <Bell size={22} color="white" />
          </Pressable>

          {/* ✅ Botón de perfil con Avatar dinámico */}
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.iconBtn}>
            {signedAvatar ? (
              <Image 
                source={{ uri: signedAvatar }} 
                style={styles.avatarMini} 
                contentFit="cover"
                transition={200}
              />
            ) : (
              <User size={22} color="white" />
            )}
          </Pressable>
        </View>

        {isLoading || (!seenLoaded && !IS_DEV_SHOW_ALL_SEEN) ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="white" />
          </View>
        ) : !deckVisible ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="white" />
          </View>
        ) : currentIndex >= data.length ? (
          <View style={styles.doneState}>
            <Text style={styles.doneText}>No hay más eventos</Text>
            {currentIndex > 0 && (
              <Pressable onPress={() => setReqUndo(true)} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Deshacer</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.deckWrap} pointerEvents="box-none">
            <PremiumSwipeDeck
              ref={deckRef}
              data={data}
              stackSize={3}
              swipeThreshold={120}
              onIndexChange={(i) => {
                setCurrentIndex(i);
                computePrefetch(i);
              }}
              onSwipedLeft={(idx) => onSwiped(idx, "left")}
              onSwipedRight={(idx) => onSwiped(idx, "right")}
              onSwipeUp={handleSwipeUp}
              renderCard={(event) => (
                <EventCard
                  eventId={event.id}
                  title={event.title}
                  description={event.description}
                  image={event.image}
                  chips={event.chips}
                  priority="high"
                />
              )}
              requestSwipeLeft={reqLeft}
              requestSwipeRight={reqRight}
              requestUndo={reqUndo}
              onConsumeRequests={() => {
                setReqLeft(false);
                setReqRight(false);
                setReqUndo(false);
              }}
            />
          </View>
        )}

        {/* FOOTER */}
        {showFooter && (
          <View pointerEvents="box-none" style={[styles.footerOverlay, { bottom: insets.bottom + 20 }]}>
            <SwipeFooter
              onUndo={() => setReqUndo(true)}
              canUndo={currentIndex > 0}
              onNope={() => setReqLeft(true)}
              onLike={() => setReqRight(true)}
            />
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullscreen: { flex: 1, backgroundColor: "transparent" },

  header: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: HEADER_BTN_SIZE,
    height: HEADER_BTN_SIZE,
    borderRadius: HEADER_BTN_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // ✅ Necesario para que el avatar respete el radio
  },
  avatarMini: {
    width: "100%",
    height: "100%",
  },

  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  doneState: { flex: 1, alignItems: "center", justifyContent: "center" },
  doneText: { color: "white", fontSize: 18, fontWeight: "bold" },
  retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#333", borderRadius: 20 },
  retryBtnText: { color: "white" },

  deckWrap: { flex: 1, zIndex: 10 },

  footerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 60,
    alignItems: "center",
  },
});