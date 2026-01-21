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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EventCard from "../../components/EventCard";
import SwipeFooter from "../../components/SwipeFooter";
import { eventsMock } from "../../mock/events";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { useFavorites } from "../../context/FavoritesContext";

const { width, height } = Dimensions.get("window");
const HEADER_BTN_SIZE = 44;

export default function DiscoverScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const swiperRef = useRef<Swiper<any>>(null);
  const insets = useSafeAreaInsets();

  const data = useMemo(() => eventsMock, []);
  const { addFavorite } = useFavorites();

  const [assetsReady, setAssetsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      try {
        const images = data.map((e) => e.image).filter(Boolean);
        await Promise.all(
          images.map((img) => Asset.fromModule(img).downloadAsync())
        );
      } finally {
        if (!cancelled) setAssetsReady(true);
      }
    };

    preload();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleSwiped = useCallback(
    (index: number) => {
      const nextIndex = index + 1;
      setCardIndex(nextIndex);
      if (nextIndex >= data.length) setIsDone(true);
    },
    [data.length]
  );

  const handleSwipedLeft = useCallback(() => {}, []);

  const handleSwipedRight = useCallback(
    (index: number) => {
      const e = data[index];
      if (e) addFavorite(e.id);
    },
    [data, addFavorite]
  );

  const renderCard = useCallback((event: any) => {
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

      <View style={styles.fullscreen}>
        {/* HEADER */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            style={styles.iconBtn}
            hitSlop={12}
          >
            <Bell size={22} color="white" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("MyEvents")}
            hitSlop={12}
            style={styles.pillWrapper}
          >
            <BlurView intensity={35} tint="dark" style={styles.pill}>
              <Text style={styles.pillText}>Mis eventos</Text>
            </BlurView>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Profile")}
            style={styles.iconBtn}
            hitSlop={12}
          >
            <User size={22} color="white" />
          </Pressable>
        </View>

        {/* SWIPER */}
        {!assetsReady ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : isDone ? (
          <View style={styles.done}>
            <Text style={styles.doneText}>No hay más eventos</Text>
          </View>
        ) : (
          <View style={styles.swiperWrap} renderToHardwareTextureAndroid>
            <Swiper
              ref={swiperRef}
              cards={data}
              renderCard={renderCard}
              cardIndex={cardIndex}
              onSwiped={handleSwiped}
              onSwipedLeft={handleSwipedLeft}
              onSwipedRight={handleSwipedRight}
              infinite={false}
              backgroundColor="transparent"
              containerStyle={styles.swiperContainer}
              cardStyle={styles.cardStyle}
              // ✅ que se vea la siguiente card sin render duplicado
              stackSize={2}
              stackSeparation={14}
              stackScale={8}
              // ✅ reduce flicker por opacidades/composición
              animateCardOpacity={false}
              animateOverlayLabelsOpacity={false}
              swipeAnimationDuration={160}
              // ✅ Android: evita recortes/flicker al mover vistas
              removeClippedSubviews={false}
              // reglas swipe
              disableTopSwipe
              disableBottomSwipe
              verticalSwipe={false}
              cardVerticalMargin={0}
              cardHorizontalMargin={0}
              useViewOverflow={Platform.OS === "ios"}
            />
          </View>
        )}

        {/* FOOTER: más junto al bloque de texto */}
        {!isDone && assetsReady && (
          <View
            pointerEvents="box-none"
            style={[styles.footerOverlay, { bottom: insets.bottom + 2 }]}
          >
            <SwipeFooter
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
  container: {
    flex: 1,
    // ✅ nunca negro, para que si hay micro-gap no “flashee”
    backgroundColor: "transparent",
  },
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

  pillWrapper: {
    height: HEADER_BTN_SIZE,
    borderRadius: HEADER_BTN_SIZE / 2,
    overflow: "hidden",
  },
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
  cardStyle: {
    width,
    height,
    backgroundColor: "transparent",
  },

  footerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: "center",
  },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  done: { flex: 1, alignItems: "center", justifyContent: "center" },
  doneText: { color: "white", fontSize: 18 },
});
