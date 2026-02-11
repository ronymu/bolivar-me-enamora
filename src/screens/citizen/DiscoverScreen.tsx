// src/screens/citizen/DiscoverScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { StyleSheet, View, Platform, ActivityIndicator, Pressable, Text, StatusBar } from "react-native";
import { Image } from "expo-image"; 
import Swiper from "react-native-deck-swiper";
import { Bell, User, RotateCcw } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import EventCard from "../../components/EventCard";
import SwipeFooter from "../../components/SwipeFooter";
import { useEvents } from "../../context/EventsContext";
import { useSeenEvents } from "../../hooks/useSeenEvents";
import { useFavorites } from "../../context/FavoritesContext";
import { useAuth } from "../../context/AuthContext";
import { getOptimizedImageUrl } from "../../utils/imageUtils"; 
import type { RootScreenProps } from "../../navigation/navTypes";
import type { Event } from "../../types/domain";

const HEADER_BTN_SIZE = 44;
const IS_DEV_SHOW_ALL_SEEN = true;
const CARD_IMAGE_WIDTH = 800; 

type Props = RootScreenProps<"Discover">;

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
    if (!seenLoaded) return [];
    return list.filter((e) => !seenIds.includes(e.id));
  }, [events, seenIds, seenLoaded]);

  const swiperKey = useMemo(() => {
    if (!data.length) return "sw-empty";
    const sig = data.slice(0, 5).map((e) => e.id).join("-");
    return `sw-${data.length}-${sig}`;
  }, [data]);

  const [isDone, setIsDone] = useState(false);
  const [deckVisible, setDeckVisible] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefetchUrls, setPrefetchUrls] = useState<string[]>([]);

  const extractUrl = (event: Event | undefined) => {
      if (!event) return null;
      if (typeof event.image === 'string') return event.image;
      if (typeof event.image === 'object' && 'uri' in event.image) return event.image.uri;
      return null;
  };

  useEffect(() => {
    if (data.length > 0) {
      setTimeout(() => setDeckVisible(true), 50);
      const urls = data.slice(0, 6).map(e => {
        const rawUrl = extractUrl(e);
        return getOptimizedImageUrl(rawUrl, CARD_IMAGE_WIDTH);
      }).filter((u): u is string => !!u);
      setPrefetchUrls(urls);
    }
  }, [data]);

  useEffect(() => { setIsDone(false); setCanUndo(false); setCurrentIndex(0); }, [swiperKey]);

  const handleSwiped = useCallback((index: number) => {
    setCurrentIndex(index + 1);
    requestAnimationFrame(() => {
      const ev = data[index];
      if (ev && !IS_DEV_SHOW_ALL_SEEN) markAsSeen(ev.id);
      setCanUndo(true);
      if (index + 1 >= data.length) setIsDone(true);

      const nextBatch = data.slice(index + 1, index + 6).map(e => {
         const rawUrl = extractUrl(e);
         return getOptimizedImageUrl(rawUrl, CARD_IMAGE_WIDTH);
      }).filter((u): u is string => !!u);
      setPrefetchUrls(nextBatch);
    });
  }, [data, markAsSeen]);

  const handleUndo = useCallback(() => {
    try { swiperRef.current?.swipeBack?.(); setIsDone(false); setCanUndo(false); setCurrentIndex(p => Math.max(0, p - 1)); } catch {}
  }, []);

  const renderCard = useCallback((event?: Event, index?: number) => {
    if (!event) return null;
    const safeIndex = index ?? -1;
    const isPriority = safeIndex === currentIndex || safeIndex === currentIndex + 1;

    return (
      <EventCard
        key={event.id}
        eventId={event.id}
        title={event.title}
        description={event.description}
        image={event.image}
        chips={event.chips}
        priority={isPriority ? "high" : "normal"}
      />
    );
  }, [currentIndex]); 

  const showFooter = !isLoading && !error && deckVisible && !isDone;

  return (
    <LinearGradient colors={["#2C2C2C", "#000000"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Ghost Preloader */}
      <View style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}>
        {prefetchUrls.map((url) => (
           <Image key={url} source={{ uri: url }} style={{ width: 1, height: 1 }} cachePolicy="memory-disk" priority="low" />
        ))}
      </View>

      <View style={styles.fullscreen}>
        {/* HEADER: Z-index alto para que sea clickable */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.iconBtn}>
            <Bell size={22} color="white" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.iconBtn}>
            <User size={22} color="white" />
          </Pressable>
        </View>

        {isLoading || (!seenLoaded && !IS_DEV_SHOW_ALL_SEEN) ? (
          <View style={styles.loadingState}><ActivityIndicator color="white" /></View>
        ) : !deckVisible ? (
          <View style={styles.loadingState}><ActivityIndicator color="white" /></View>
        ) : isDone ? (
          <View style={styles.doneState}>
             <Text style={styles.doneText}>No hay más eventos</Text>
             {canUndo && <Pressable onPress={handleUndo} style={styles.retryBtn}><Text style={styles.retryBtnText}>Deshacer</Text></Pressable>}
          </View>
        ) : (
          <View style={styles.swiperWrap} renderToHardwareTextureAndroid>
            <Swiper
              key={swiperKey}
              ref={swiperRef}
              cards={data}
              renderCard={renderCard}
              onSwiped={handleSwiped}
              infinite={false}
              backgroundColor="transparent"
              cardHorizontalMargin={0}
              cardVerticalMargin={0}
              containerStyle={styles.swiperContainer}
              stackSize={3}
              stackSeparation={14}
              stackScale={0.97}
              animateCardOpacity={false}
              disableTopSwipe disableBottomSwipe
              useViewOverflow={Platform.OS === "ios"}
            />
          </View>
        )}

        {/* FOOTER: 🔥 EL FIX CRÍTICO ESTÁ AQUÍ 🔥 */}
        {showFooter && (
          <View 
            // 🎯 Usamos 'box-none' para que los botones de adentro funcionen
            pointerEvents="box-none" 
            style={[styles.footerOverlay, { bottom: insets.bottom + 20 }]}
          >
            <SwipeFooter 
              onUndo={handleUndo} 
              canUndo={canUndo} 
              onNope={() => swiperRef.current?.swipeLeft()} 
              onLike={() => swiperRef.current?.swipeRight()} 
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
    position: "absolute", left: 14, right: 14, zIndex: 50, // Subimos Z-index
    flexDirection: "row", justifyContent: "space-between" 
  },
  iconBtn: { width: HEADER_BTN_SIZE, height: HEADER_BTN_SIZE, borderRadius: HEADER_BTN_SIZE/2, backgroundColor: "rgba(0,0,0,0.22)", alignItems:"center", justifyContent:"center" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  doneState: { flex: 1, alignItems: "center", justifyContent: "center" },
  doneText: { color: "white", fontSize: 18, fontWeight: "bold" },
  retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#333", borderRadius: 20 },
  retryBtnText: { color: "white" },
  swiperWrap: { flex: 1, zIndex: 10 },
  swiperContainer: { flex: 1, backgroundColor: "transparent" },
  footerOverlay: { 
    position: "absolute", left: 0, right: 0, 
    zIndex: 60, // El footer debe estar por encima de todo
    alignItems: "center" 
  },
});