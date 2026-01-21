// src/screens/citizen/NotificationsScreen.tsx
import React, { useMemo } from "react";
import { StyleSheet, View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ArrowLeft, Bell, ChevronRight } from "lucide-react-native";

import type { RootStackParamList } from "../../navigation/AppNavigator";
import { useFavorites } from "../../context/FavoritesContext";
import { eventsMock } from "../../mock/events";

const COLORS = {
  bg: "#F2F2F2",
  surface: "#FFFFFF",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.75)",
  border: "rgba(107,100,93,0.22)",
  coral: "#FF6969",
  coralSoft: "rgba(255,105,105,0.12)",
};

type Nav = NativeStackNavigationProp<RootStackParamList, "Notifications">;

type NotificationItem = {
  id: string;
  eventId: string;
  title: string;
  body: string;
  meta: string; // ej: "Hoy • 5:00 PM • Getsemaní, Cartagena"
};

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { favoriteIds } = useFavorites();

  // MVP: generamos “notificaciones” desde favoritos
  const notifications: NotificationItem[] = useMemo(() => {
    const favoriteEvents = eventsMock.filter((e) => favoriteIds.includes(e.id));

    // Si quisieras orden: aquí podríamos ordenar por fecha real cuando exista startAt ISO.
    return favoriteEvents.map((e) => ({
      id: `notif-${e.id}`,
      eventId: e.id,
      title: `Recordatorio: ${e.title}`,
      body: "Tu evento se está acercando. Toca para ver los detalles.",
      meta: `${e.dateLabel} • ${e.location}`,
    }));
  }, [favoriteIds]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: 16 }]}>
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

        <Text style={styles.headerTitle} accessibilityRole="header">
          Notificaciones
        </Text>

        <View style={{ width: 44, height: 44 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          paddingTop: 6,
          flexGrow: notifications.length === 0 ? 1 : 0,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Bell size={18} color={COLORS.text} />
            </View>
            <Text style={styles.emptyTitle}>Aún no tienes notificaciones</Text>
            <Text style={styles.emptyText}>
              Guarda eventos en favoritos y aquí verás recordatorios cuando se acerquen.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityHint="Abre el detalle del evento"
            onPress={() => navigation.navigate("EventDetail", { eventId: item.eventId })}
            style={({ pressed }) => [
              styles.card,
              pressed ? styles.cardPressed : null,
            ]}
          >
            <View style={styles.leftIcon}>
              <Bell size={18} color={COLORS.text} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.meta}
              </Text>
            </View>

            <ChevronRight size={18} color={COLORS.textSoft} />
          </Pressable>
        )}
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
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
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

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardPressed: {
    borderColor: "rgba(255,105,105,0.55)",
    backgroundColor: COLORS.coralSoft,
  },

  leftIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(107,100,93,0.08)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  body: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 3, lineHeight: 16 },
  meta: { color: COLORS.textSoft, fontSize: 12, fontWeight: "800", marginTop: 8 },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(107,100,93,0.08)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
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
    fontWeight: "700",
  },
});
