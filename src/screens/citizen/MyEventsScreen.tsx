// src/screens/citizen/MyEventsScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, Pressable, Image, ActivityIndicator } from "react-native";
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
  const { getById, hydrateById, isLoading: isListLoading } = useEvents();

  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favoriteEvents = useMemo<Event[]>(() => {
    // Mantener el orden del usuario (según favoriteIds)
    const out: Event[] = [];
    for (const id of favoriteIds) {
      const e = getById(id);
      if (e) out.push(e);
    }
    return out;
  }, [favoriteIds, getById]);

  const hydrateMissing = useCallback(async () => {
    if (favoriteIds.length === 0) return;

    setIsHydrating(true);
    setError(null);

    try {
      // Hidrata todos los IDs (si ya está en cache, mergea suave)
      await Promise.all(favoriteIds.map((id) => hydrateById(id)));
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron cargar tus eventos guardados.");
    } finally {
      setIsHydrating(false);
    }
  }, [favoriteIds, hydrateById]);

  useEffect(() => {
    hydrateMissing();
  }, [hydrateMissing]);

  const showLoading = isListLoading || (isHydrating && favoriteIds.length > 0);

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
      {showLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.emptyText}>Cargando…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No se pudieron cargar tus eventos</Text>
          <Text style={styles.emptyText}>{error}</Text>

          <Pressable
            onPress={hydrateMissing}
            style={({ pressed }) => [styles.retryBtn, pressed ? styles.retryBtnPressed : null]}
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : favoriteIds.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Aún no tienes eventos guardados</Text>
          <Text style={styles.emptyText}>
            Haz swipe a la derecha en Discover para guardar tus favoritos.
          </Text>
        </View>
      ) : favoriteEvents.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Tus favoritos no están disponibles</Text>
          <Text style={styles.emptyText}>
            Puede que algunos eventos ya no estén publicados. Intenta recargar.
          </Text>

          <Pressable
            onPress={hydrateMissing}
            style={({ pressed }) => [styles.retryBtn, pressed ? styles.retryBtnPressed : null]}
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favoriteEvents}
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
                  <Image source={item.image} style={styles.image} resizeMode="cover" fadeDuration={0} />
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

  retryBtn: {
    marginTop: 14,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.18)",
  },
  retryBtnPressed: { backgroundColor: "rgba(0,0,0,0.10)" },
  retryBtnText: { color: COLORS.text, fontWeight: "900" },

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
