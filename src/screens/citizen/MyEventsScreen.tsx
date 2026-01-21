// src/screens/citizen/MyEventsScreen.tsx
import React, { useMemo } from "react";
import { StyleSheet, View, Text, Pressable, FlatList, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Heart } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { eventsMock } from "../../mock/events";
import { useFavorites } from "../../context/FavoritesContext";
import type { RootStackParamList } from "../../navigation/AppNavigator";

const COLORS = {
  bg: "#F2F2F2",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.7)",
  surface: "#FFFFFF",
  border: "rgba(107,100,93,0.22)",
  coral: "#FF6969",
};

type Nav = NativeStackNavigationProp<RootStackParamList, "MyEvents">;

export default function MyEventsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { favoriteIds, removeFavorite, addFavorite, isFavorite } = useFavorites();

  const events = useMemo(
    () => eventsMock.filter((e) => favoriteIds.includes(e.id)),
    [favoriteIds]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          accessibilityHint="Regresa a la pantalla anterior"
          onPress={navigation.goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed ? styles.backBtnPressed : null]}
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </Pressable>

        <Text style={styles.headerTitle}>Mis eventos</Text>

        <View style={{ width: 44, height: 44 }} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          paddingTop: 4,
          flexGrow: events.length === 0 ? 1 : 0,
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
            <Text style={styles.emptyText}>
              Guarda eventos desde Discover y aparecerán aquí para volver cuando quieras.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const liked = isFavorite(item.id);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir detalle de ${item.title}`}
              accessibilityHint="Abre la información completa del evento"
              onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            >
              <View style={styles.imageWrap}>
                <Image
                  source={item.image}
                  style={styles.image}
                  resizeMode="cover"
                  fadeDuration={150}
                  resizeMethod="resize"
                />

                {/* Botón favorito dentro de la imagen (esquina superior derecha) */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={liked ? "Quitar de favoritos" : "Guardar en favoritos"}
                  accessibilityHint="Marca o desmarca este evento"
                  onPress={(e) => {
                    // Evita que también navegue al detalle
                    e.stopPropagation();
                    liked ? removeFavorite(item.id) : addFavorite(item.id);
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.likeBtn,
                    pressed ? styles.likeBtnPressed : null,
                  ]}
                >
                  <Heart
                    size={20}
                    color={liked ? COLORS.coral : "white"}
                    fill={liked ? COLORS.coral : "transparent"}
                  />
                </Pressable>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.dateLabel}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    backgroundColor: "rgba(107,100,93,0.06)",
  },

  separator: { height: 14 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPressed: {
    borderColor: "rgba(107,100,93,0.35)",
    backgroundColor: "rgba(107,100,93,0.02)",
  },

  imageWrap: { position: "relative" },
  image: { height: 170, width: "100%" },

  likeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  cardContent: { padding: 16 },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.textSoft, marginTop: 6, lineHeight: 18 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontWeight: "700", color: COLORS.textSoft },
  metaDot: { marginHorizontal: 8, color: COLORS.textSoft },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSoft,
    textAlign: "center",
  },
});
