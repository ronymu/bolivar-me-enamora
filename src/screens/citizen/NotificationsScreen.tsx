// src/screens/citizen/NotificationsScreen.tsx
import React, { useMemo } from "react";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

import { useFavorites } from "../../context/FavoritesContext";
import { useEvents } from "../../context/EventsContext";
import type { RootScreenProps } from "../../navigation/navTypes";
import type { Event } from "../../types/domain";

type Props = RootScreenProps<"Notifications">;

type NotificationItem = {
  id: string;
  eventId: string;
  title: string;
  subtitle: string;
};

export default function NotificationsScreen({ navigation }: Props) {
  const { favoriteIds } = useFavorites();
  const { events, isLoading } = useEvents();

  const notifications = useMemo<NotificationItem[]>(() => {
    const favEvents: Event[] = events.filter((e) => favoriteIds.includes(e.id));

    // MVP simple: 1 notificación por evento favorito
    return favEvents.map((e) => ({
      id: `fav-${e.id}`,
      eventId: e.id,
      title: "Recordatorio guardado",
      subtitle: `${e.title} • ${e.dateLabel}`,
    }));
  }, [events, favoriteIds]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          style={styles.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={22} color="#6B645D" />
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">
          Notificaciones
        </Text>

        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Cargando…</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
          <Text style={styles.emptyText}>
            Guarda eventos para ver recordatorios aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate("EventDetail", { eventId: item.eventId })}
              accessibilityRole="button"
              accessibilityLabel={`Abrir evento: ${item.subtitle}`}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F2" },

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
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.22)",
  },

  title: { fontSize: 18, fontWeight: "900", color: "#6B645D" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#6B645D", textAlign: "center" },
  emptyText: { marginTop: 8, color: "rgba(107,100,93,0.75)", fontWeight: "700", textAlign: "center" },

  row: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.18)",
  },
  rowTitle: { fontSize: 14, fontWeight: "900", color: "#6B645D" },
  rowSub: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "rgba(107,100,93,0.75)" },
});
