// src/screens/citizen/MyEventsScreen.tsx
import React, { useMemo } from "react";
import { StyleSheet, View, Text, FlatList, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Heart } from "lucide-react-native";

import { useFavorites } from "../../context/FavoritesContext";
import { useEvents } from "../../context/EventsContext";
import type { RootScreenProps } from "../../navigation/navTypes";
import type { Event } from "../../types/domain";

type Props = RootScreenProps<"MyEvents">;

const COLORS = {
  bg: "#F2F2F2",
  surface: "#FFFFFF",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.75)",
  border: "rgba(107,100,93,0.18)",
  coral: "#FF6969",
};

export default function MyEventsScreen({ navigation }: Props) {
  const { favoriteIds, removeFavorite, isFavorite } = useFavorites();
  const { events, isLoading } = useEvents();

  const favorites = useMemo<Event[]>(
    () => events.filter((e) => favoriteIds.includes(e.id)),
    [events, favoriteIds]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          style={styles.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">
          Mis eventos
        </Text>

        {/* placeholder para centrar título */}
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Cargando…</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Aún no tienes eventos guardados</Text>
          <Text style={styles.emptyText}>
            Haz swipe a la derecha en Discover para guardar tus favoritos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const liked = isFavorite(item.id);

            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Abrir detalle de ${item.title}`}
              >
                {/* Imagen */}
                <View style={styles.imageWrap}>
                  <Image
                    source={item.image}
                    style={styles.image}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                </View>

                {/* Texto */}
                <View style={styles.content}>
                  <View style={styles.rowTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>

                    {/* Corazón para quitar de favoritos */}
                    <Pressable
                      onPress={(e) => {
                        // Evita que se dispare el onPress de la tarjeta
                        e.stopPropagation?.();
                        removeFavorite(item.id);
                      }}
                      hitSlop={10}
                      style={styles.heartBtn}
                      accessibilityRole="button"
                      accessibilityLabel={liked ? "Quitar de favoritos" : "Guardar en favoritos"}
                      accessibilityState={{ selected: liked }}
                    >
                      <Heart
                        size={18}
                        color={liked ? COLORS.coral : COLORS.textSoft}
                        fill={liked ? COLORS.coral : "transparent"}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.meta} numberOfLines={1}>
                    {item.dateLabel} • {item.locationLabel}
                  </Text>

                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.22)",
  },

  title: { fontSize: 18, fontWeight: "900", color: COLORS.text },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text, textAlign: "center" },
  emptyText: { marginTop: 8, color: COLORS.textSoft, fontWeight: "700", textAlign: "center" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: "hidden",
  },

  imageWrap: {
    height: 150,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  image: {
    height: "100%",
    width: "100%",
  },

  content: {
    padding: 14,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },

  heartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.18)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  meta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSoft,
  },

  desc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: COLORS.textSoft,
  },
});
