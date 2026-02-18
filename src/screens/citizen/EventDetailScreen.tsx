// src/screens/citizen/EventDetailScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  Linking,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker } from "react-native-maps"; // Keep for map functionality
import { ArrowLeft, Heart, MapPin, Share2, Calendar, Phone, MessageCircle, Banknote } from "lucide-react-native";

import { useFavorites } from "../../context/FavoritesContext";
import { useEvents } from "../../context/EventsContext";
import { shareEvent } from "../../utils/shareUtils"; // ✅ Importamos la utilidad
import type { RootScreenProps } from "../../navigation/navTypes";
import { getOptimizedImageUrl } from "../../utils/imageUtils";
import { getEventImages, getMapAddress, getMapCoords, getOrganizer } from "../../adapters/eventAdapter";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const HERO_H = Math.round(SCREEN_H * 0.5); // 50%

const COLORS = {
  bg: "#FFFFFF", // Pure white background
  text: "#2D2D2D", // Dark text for body
  textSoft: "#919191", // Use the accent for soft text
  border: "#F0F0F0", // Very light border
  surface: "#FFFFFF", // Pure white for contrast
  accent: "#919191", // The main accent color
  accentSoft: "#FBFBFB", // Organizer card background
};

// Minimalist map style (Silver)
const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

type Props = RootScreenProps<"EventDetail">;

function openNavigationChoice(lat: number, lng: number) {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;

  const options = [
    { text: 'Google Maps', onPress: () => Linking.openURL(googleMapsUrl).catch(() => Alert.alert("Error", "No se pudo abrir Google Maps.")) },
    { text: 'Waze', onPress: () => Linking.openURL(wazeUrl).catch(() => Alert.alert("Error", "No se pudo abrir Waze. ¿Lo tienes instalado?")) },
  ];

  if (Platform.OS === 'ios') {
    options.push({ text: 'Apple Maps', onPress: () => Linking.openURL(appleMapsUrl).catch(() => Alert.alert("Error", "No se pudo abrir Apple Maps.")) });
  }

  const cancelOption = { text: 'Cancelar', style: 'cancel' as const };
  const alertOptions = [...options, cancelOption];

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: alertOptions.map(o => o.text),
        cancelButtonIndex: alertOptions.length - 1,
      },
      (buttonIndex) => {
        if (buttonIndex < options.length) {
          options[buttonIndex].onPress();
        }
      }
    );
  } else {
    Alert.alert('Navegar a', 'Elige una aplicación de mapas', alertOptions);
  }
}

export default function EventDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;

  const { getById, hydrateById, isLoading: isListLoading } = useEvents();
  const [isHydrating, setIsHydrating] = useState(false);

  const event = useMemo(() => getById(eventId), [getById, eventId]);

  // Flag to determine if the full gallery data has been loaded from the backend.
  const isGalleryReady = useMemo(() => !!(event?.images && event.images.length > 0), [event]);

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
  const heroContentOpacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useEffect(() => {
    // Animate the hero content in only when the gallery data is actually ready.
    if (isGalleryReady) {
      Animated.timing(heroContentOpacity, {
        toValue: 1,
        duration: 300, // Match image transition for smoothness
        useNativeDriver: true,
      }).start();
    }
  }, [isGalleryReady, heroContentOpacity]);

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
          style={({ pressed }) => [styles.errorBtn, pressed ? styles.errorBtnPressed : null]}
        >
          <Text style={styles.errorBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const OVERLAP = 40; // Floating card effect

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  const organizer = getOrganizer(event);
  const address = getMapAddress(event);
  const { latitude: lat, longitude: lng } = getMapCoords(event);
  const images = useMemo(() => getEventImages(event), [event]);
  
  // Asumimos que estos datos vienen del adaptador o del evento
  const priceLabel = (event as any).priceLabel ?? 'Consultar';
  const ticketUrl = (event as any).ticketUrl;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} // Space for sticky footer
      >
        {/* HERO */}
        <View style={styles.hero}>
          {/* Render the gallery only when the full data is available to prevent flickering the cover image. */}
          {isGalleryReady ? (
            <Animated.View style={{ flex: 1, opacity: heroContentOpacity }}>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                scrollEnabled={images.length > 1}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumEnd}
                keyExtractor={(_, i) => `${event.id}-${i}`}
                renderItem={({ item }) => (
                  <View style={styles.heroSlide}>
                    <Image
                      source={item}
                      style={styles.heroImage}
                      contentFit="cover"
                      transition={300}
                    />
                  </View>
                )}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.5)"]}
                locations={[0, 0.5, 1]}
                style={styles.heroGradient}
                pointerEvents="none"
              />
            </Animated.View>
          ) : null}

          {isGalleryReady && images.length > 1 && (
            <Animated.View pointerEvents="none" style={[styles.dotsRow, { bottom: OVERLAP + 18, opacity: heroContentOpacity }]}>
              {images.map((_, i) => (
                <View key={`${event.id}-dot-${i}`} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </Animated.View>
          )}

          <View style={[styles.header, { top: insets.top + 10 }]}>
            <Pressable style={styles.glassBtn} onPress={navigation.goBack} hitSlop={10}>
              <ArrowLeft size={22} color="white" strokeWidth={1.5} />
            </Pressable>

            {/* ✅ Grupo de acciones: Compartir y Favorito */}
            <View style={styles.headerActions}>
              <Pressable 
                style={styles.glassBtn}
                onPress={() => shareEvent(event)} 
                hitSlop={10}
                accessibilityLabel="Compartir evento"
              >
                <Share2 size={20} color="white" strokeWidth={2} />
              </Pressable>

              <Pressable
                style={styles.glassBtn}
                onPress={() => (liked ? removeFavorite(event.id) : addFavorite(event.id))}
                hitSlop={10}
                accessibilityLabel={liked ? "Quitar de favoritos" : "Añadir a favoritos"}
              >
                <Heart size={22} color={liked ? COLORS.accent : "white"} fill={liked ? COLORS.accent : "transparent"} strokeWidth={2} />
              </Pressable>
            </View>
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
            {/* 1. Título */}
            <View style={styles.titleRow}>
              <Text style={styles.mainTitle} accessibilityRole="header">
                {event.title}
              </Text>
            </View>

            <View style={styles.separator} />

            {/* 2. Fecha, Lugar y Precio */}
            <View style={styles.logisticsGrid}>
              <View style={styles.logisticsItem}>
                <Calendar size={18} color={COLORS.textSoft} />
                <Text style={styles.logisticsText}>{event.dateLabel}</Text>
              </View>
              <View style={styles.logisticsItem}>
                <MapPin size={18} color={COLORS.textSoft} />
                <Text style={styles.logisticsText}>{event.locationLabel}</Text>
              </View>
              <View style={styles.logisticsItem}>
                <Banknote size={18} color={COLORS.textSoft} />
                <Text style={styles.logisticsText}>{priceLabel}</Text>
              </View>
            </View>

            <View style={styles.separator} />

            {/* 3. Descripción */}
            <View>
              <Text style={styles.descriptionSubtitle}>¡No te lo puedes perder!</Text>
              <Text style={styles.descriptionText}>{event.fullDescription}</Text>
            </View>

            <View style={styles.separator} />

            {/* 4. Tarjeta del Organizador */}
            <View style={styles.organizerCard}>
              <Image source={{ uri: (organizer as any).avatar_url }} style={styles.organizerAvatar} />
              <View style={styles.organizerInfo}>
                <Text style={styles.organizerLabel}>Organizado por</Text>
                <Text style={styles.organizerName}>{organizer.name}</Text>
              </View>
              <View style={styles.organizerActions}>
                {(organizer as any).phone && (
                  <Pressable
                    style={styles.organizerActionBtn}
                    onPress={() => Linking.openURL(`tel:${(organizer as any).phone}`).catch(() => { })}
                    hitSlop={10}
                  >
                    <Phone size={18} color={COLORS.text} strokeWidth={2} />
                  </Pressable>
                )}
                <Pressable
                  style={styles.organizerActionBtn}
                  onPress={() => Alert.alert("Próximamente", "La mensajería con el organizador estará disponible pronto.")}
                  hitSlop={10}
                >
                  <MessageCircle size={18} color={COLORS.text} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* 5. Mapa */}
            {lat != null && lng != null && (
              <>
                <View style={styles.separator} />
                <View>
                  <Pressable onPress={() => openNavigationChoice(lat, lng)}>
                    <MapView
                      style={styles.map}
                      customMapStyle={mapStyle}
                      pointerEvents="none"
                      initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                    >
                      <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={COLORS.accent} />
                    </MapView>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Botón de accion reserva y  precio */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <LinearGradient colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']} style={styles.footerGradient} />
        <View style={styles.footerInner}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>Precio Total</Text>
            <Text style={styles.footerPriceValue}>{priceLabel}</Text>
          </View>
          <Pressable
            style={styles.footerButton}
            onPress={() => {
              if (ticketUrl) Linking.openURL(ticketUrl).catch(() => {});
              else Alert.alert("Entradas", "La información de entradas no está disponible.");
            }}
          >
            <Text style={styles.footerButtonText}>
              {priceLabel.toLowerCase() === 'gratis' ? 'Reservar Ahora' : 'Comprar Ticket'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
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

  hero: { height: HERO_H, backgroundColor: "#E1E1E1" },
  heroSlide: { width: SCREEN_W, height: HERO_H, backgroundColor: "#E1E1E1" },
  heroImage: { width: SCREEN_W, height: HERO_H },

  header: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20, // Ensure buttons are on top
  },
  headerActions: {
    flexDirection: "row",
    gap: 12, // ✅ Espacio entre compartir y corazón
  },

  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    borderRadius: 40,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 24,
  },
  
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 38,
    flex: 1,
  },
  priceChip: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceChipText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 13,
  },

  descriptionSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: COLORS.text,
  },

  logisticsGrid: {
    gap: 16,
  },
  logisticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logisticsText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text,
  },

  organizerCard: {
    backgroundColor: COLORS.accentSoft, // #FBFBFB
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  organizerInfo: {
    flex: 1,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bg,
    marginRight: 14,
  },
  organizerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSoft,
  },
  organizerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  organizerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  organizerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  map: {
    height: 200,
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 20,
  },
  footerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  footerPriceLabel: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: '500',
  },
  footerPriceValue: {
    color: '#919191',
    fontSize: 22,
    fontWeight: '300',
    marginTop: 2,
  },
  footerButton: {
    backgroundColor: '#919191',
    height: 54,
    borderRadius: 999, // Pill button
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: '60%',
  },
  footerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
});