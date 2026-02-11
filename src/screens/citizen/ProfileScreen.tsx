// src/screens/citizen/ProfileScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  CalendarHeart,
  Ticket,
  ChevronRight,
  HelpCircle,
  Shield,
  FileText,
  LogOut,
  User,
  LogIn,
  UserPlus,
  Trash2,
} from "lucide-react-native";

import type { RootScreenProps } from "../../navigation/navTypes";
import { useNotificationPrefs } from "../../hooks/useNotificationPrefs";
import { useAuth } from "../../context/AuthContext";
import { supabaseMobile } from "../../lib/supabaseMobileClient";

const COLORS = {
  bg: "#F2F2F2",
  surface: "#FFFFFF",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.75)",
  border: "rgba(107,100,93,0.22)",
  coral: "#FF6969",
  coralSoft: "rgba(255,105,105,0.12)",
};

type Props = RootScreenProps<"Profile">;

type QuickAction = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

type RowItem = {
  key: string;
  title: string;
  subtitle?: string;
  leftIcon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

type ProfileRow = {
  id: string;
  role?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  organization_name?: string | null;
  avatar_url?: string | null;
};

function roleToLabel(role?: string | null) {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "admin") return "Administrador";
  if (r === "organizer") return "Organizador";
  if (r === "citizen") return "Ciudadano";
  return "Usuario";
}

function pickName(p?: ProfileRow | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  const org = (p?.organization_name ?? "").trim();
  return dn || fn || org || "Usuario";
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { remindersEnabled, setRemindersEnabled } = useNotificationPrefs();

  const { user: authUser, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      const userId = authUser?.id;
      if (!userId) {
        setProfileRow(null);
        setProfileError(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      try {
        const { data, error } = await supabaseMobile
          .from("profiles")
          .select("id, role, display_name, full_name, organization_name, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw new Error(error.message);

        if (!alive) return;
        setProfileRow((data as any) ?? null);
      } catch (e: any) {
        if (!alive) return;
        setProfileRow(null);
        setProfileError(e?.message ?? "No se pudo cargar el perfil.");
      } finally {
        if (!alive) return;
        setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, [authUser?.id]);

  const user = useMemo(() => {
    const hasSession = !!authUser;

    const name = hasSession ? pickName(profileRow) : "Visitante";
    const email = hasSession ? (authUser?.email ?? "Sin email") : "Inicia sesión para guardar en la nube";
    const roleLabel = hasSession ? roleToLabel(profileRow?.role ?? "citizen") : "Modo invitado";

    return {
      fullName: name,
      email,
      roleLabel,
      avatarUrl: profileRow?.avatar_url ?? null,
      hasSession,
    };
  }, [authUser, profileRow]);

  const showComingSoon = () => {
    Alert.alert("Próximamente", "Esta función estará disponible en una próxima versión.", [
      { text: "Entendido", style: "cancel" },
    ]);
  };

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        key: "myevents",
        title: "Mis eventos",
        subtitle: user.hasSession ? "Tus guardados y planes" : "Guardados en este dispositivo",
        icon: <CalendarHeart size={18} color={COLORS.text} />,
        onPress: () => navigation.navigate("MyEvents"),
      },
      {
        key: "notifications",
        title: "Notificaciones",
        subtitle: "Recordatorios y novedades",
        icon: <Bell size={18} color={COLORS.text} />,
        onPress: () => navigation.navigate("Notifications"),
      },
      {
        key: "tickets",
        title: "Mis tickets",
        subtitle: "Próximamente",
        icon: <Ticket size={18} color={COLORS.textSoft} />,
        disabled: true,
      },
    ],
    [navigation, user.hasSession]
  );

  const rows: RowItem[] = useMemo(
    () => [
      {
        key: "privacy",
        title: "Privacidad",
        subtitle: "Controla tu información",
        leftIcon: <Shield size={18} color={COLORS.text} />,
        onPress: showComingSoon,
      },
      {
        key: "help",
        title: "Ayuda",
        subtitle: "Soporte y preguntas",
        leftIcon: <HelpCircle size={18} color={COLORS.text} />,
        onPress: showComingSoon,
      },
      {
        key: "terms",
        title: "Términos y condiciones",
        subtitle: "Legal",
        leftIcon: <FileText size={18} color={COLORS.text} />,
        onPress: showComingSoon,
      },
    ],
    []
  );

  const handleLogout = () => {
    if (!user.hasSession) {
      // ✅ Invitado: acción útil (no botón muerto)
      navigation.navigate("Login");
      return;
    }

    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres salir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              await signOut();
              navigation.reset({ index: 0, routes: [{ name: "Discover" }] });
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "No se pudo cerrar sesión. Intenta de nuevo.", [{ text: "OK" }]);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ✅ Handler “honesto” para MVP (Apple compliance)
  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción solicitará el borrado permanente de tus datos. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Solicitar eliminación",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              // FUTURO: supabase.functions.invoke("delete-account")
              await signOut();
              navigation.reset({ index: 0, routes: [{ name: "Discover" }] });

              Alert.alert(
                "Solicitud enviada",
                "Hemos recibido tu solicitud. Tus datos serán eliminados permanentemente en un plazo de 72 horas."
              );
            } catch {
              // si falla, al menos quitamos loading
              setLoggingOut(false);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Perfil
          </Text>
        </View>

        {/* USER CARD */}
        <View
          style={styles.userCard}
          accessible
          accessibilityLabel={`Usuario: ${user.fullName}. Email: ${user.email}. Rol: ${user.roleLabel}.`}
        >
          <View style={styles.avatar}>
            <User size={22} color={COLORS.text} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {user.fullName}
            </Text>

            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>

            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{user.roleLabel}</Text>
            </View>

            {/* Estado perfil */}
            {user.hasSession && profileLoading ? (
              <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator />
                <Text style={[styles.profileHint, { color: COLORS.textSoft }]}>Cargando perfil…</Text>
              </View>
            ) : user.hasSession && profileError ? (
              <Text style={[styles.profileHint, { color: COLORS.textSoft, marginTop: 10 }]}>
                No se pudo cargar el rol/nombre. (Puedes seguir usando la app)
              </Text>
            ) : null}
          </View>
        </View>

        {/* ✅ CTA INVITADO (evita botón muerto y el “ciclo”) */}
        {!user.hasSession && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>

            <View style={styles.block}>
              <Pressable
                onPress={() => navigation.navigate("Login")}
                accessibilityRole="button"
                accessibilityLabel="Iniciar sesión"
                style={({ pressed }) => [styles.authRow, pressed ? styles.pressedRow : null]}
              >
                <View style={styles.navLeft}>
                  <View style={styles.navIcon}>
                    <LogIn size={18} color={COLORS.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.navTitle}>Iniciar sesión</Text>
                    <Text style={styles.navSubtitle}>Sincroniza tus favoritos</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={COLORS.textSoft} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                onPress={() => navigation.navigate("Signup")}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta"
                style={({ pressed }) => [styles.authRow, pressed ? styles.pressedRow : null]}
              >
                <View style={styles.navLeft}>
                  <View style={styles.navIcon}>
                    <UserPlus size={18} color={COLORS.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.navTitle}>Crear cuenta</Text>
                    <Text style={styles.navSubtitle}>Toma menos de 1 minuto</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={COLORS.textSoft} />
              </Pressable>
            </View>
          </View>
        )}

        {/* QUICK ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos</Text>

          <View style={styles.quickGrid}>
            {quickActions.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.disabled ? undefined : item.onPress}
                disabled={!!item.disabled}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityHint={item.subtitle}
                accessibilityState={{ disabled: !!item.disabled }}
                style={({ pressed }) => [
                  styles.quickCard,
                  item.disabled ? styles.disabled : null,
                  pressed && !item.disabled ? styles.pressed : null,
                ]}
              >
                <View style={styles.quickIcon}>{item.icon}</View>
                <Text style={styles.quickTitle}>{item.title}</Text>
                <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>

          <View style={styles.block}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Modo oscuro</Text>
                <Text style={styles.rowSubtitle}>Próximamente</Text>
              </View>
              <Switch
                value={false}
                onValueChange={() => {}}
                disabled
                accessibilityLabel="Modo oscuro"
                accessibilityHint="Función próximamente"
                accessibilityState={{ disabled: true }}
                trackColor={{ false: "rgba(107,100,93,0.15)", true: COLORS.coralSoft }}
                thumbColor="rgba(107,100,93,0.45)"
                ios_backgroundColor="rgba(107,100,93,0.15)"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Recordatorios</Text>
                <Text style={styles.rowSubtitle}>Antes de tus eventos</Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                accessibilityLabel="Recordatorios"
                accessibilityHint="Activa o desactiva recordatorios de eventos guardados"
                accessibilityState={{ checked: remindersEnabled }}
                trackColor={{ false: "rgba(107,100,93,0.25)", true: COLORS.coralSoft }}
                thumbColor={remindersEnabled ? COLORS.coral : "rgba(107,100,93,0.65)"}
                ios_backgroundColor="rgba(107,100,93,0.25)"
              />
            </View>
          </View>
        </View>

        {/* SUPPORT / LEGAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>

          <View style={styles.block}>
            {rows.map((r, idx) => (
              <View key={r.key}>
                <Pressable
                  onPress={r.disabled ? undefined : r.onPress}
                  disabled={!!r.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={r.title}
                  accessibilityHint={r.subtitle ?? "Abrir sección"}
                  accessibilityState={{ disabled: !!r.disabled }}
                  style={({ pressed }) => [styles.navRow, r.disabled ? styles.disabled : null, pressed ? styles.pressedRow : null]}
                >
                  <View style={styles.navLeft}>
                    <View style={styles.navIcon}>{r.leftIcon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.navTitle}>{r.title}</Text>
                      {r.subtitle ? <Text style={styles.navSubtitle}>{r.subtitle}</Text> : null}
                    </View>
                  </View>

                  <ChevronRight size={18} color={COLORS.textSoft} />
                </Pressable>

                {idx !== rows.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>

          <Text style={styles.versionText}>Versión 0.1 • MVP</Text>
        </View>

        {/* ✅ LOGOUT (más arriba que zona de peligro) */}
        <View style={styles.section}>
          <Pressable
            onPress={loggingOut ? undefined : handleLogout}
            accessibilityRole="button"
            accessibilityLabel={user.hasSession ? "Cerrar sesión" : "Iniciar sesión"}
            accessibilityHint={user.hasSession ? "Cierra la sesión actual" : "Abre la pantalla para iniciar sesión"}
            accessibilityState={{ disabled: loggingOut }}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && !loggingOut ? styles.logoutPressed : null,
              loggingOut ? styles.disabled : null,
            ]}
            disabled={loggingOut}
          >
            {user.hasSession ? <LogOut size={18} color={COLORS.text} /> : <LogIn size={18} color={COLORS.text} />}
            <Text style={styles.logoutText}>
              {loggingOut ? "Procesando..." : user.hasSession ? "Cerrar sesión" : "Iniciar sesión"}
            </Text>

            {loggingOut ? <ActivityIndicator style={{ marginLeft: "auto" }} /> : <Text style={styles.logoutHint} />}
          </Pressable>
        </View>

        {/* ✅ ZONA DE PELIGRO (solo logueados) */}
        {user.hasSession && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.coral }]}>Zona de peligro</Text>
            <Pressable
              onPress={handleDeleteAccount}
              style={({ pressed }) => [
                styles.logoutBtn,
                { borderColor: COLORS.coralSoft, backgroundColor: "rgba(255,105,105,0.05)" },
                pressed ? styles.logoutPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Eliminar mi cuenta"
              accessibilityHint="Solicita el borrado permanente de tu cuenta"
            >
              <Trash2 size={18} color={COLORS.coral} />
              <Text style={[styles.logoutText, { color: COLORS.coral }]}>Eliminar mi cuenta</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16 },

  header: { paddingTop: 10, paddingBottom: 14 },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  userCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(107,100,93,0.08)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  email: {
    color: COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  rolePill: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(107,100,93,0.08)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.14)",
  },
  roleText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },

  profileHint: { fontSize: 12, fontWeight: "700" },

  section: { marginTop: 18 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 10,
  },

  quickGrid: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(107,100,93,0.08)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickTitle: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  quickSubtitle: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 4 },

  block: {
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  rowSubtitle: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 2 },

  divider: { height: 1, backgroundColor: "rgba(107,100,93,0.14)" },

  navRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(107,100,93,0.08)",
    borderWidth: 1,
    borderColor: "rgba(107,100,93,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  navSubtitle: { color: COLORS.textSoft, fontSize: 12, fontWeight: "700", marginTop: 2 },

  versionText: { marginTop: 10, color: COLORS.textSoft, fontSize: 12, fontWeight: "700" },

  logoutBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoutPressed: {
    borderColor: "rgba(255,105,105,0.55)",
    backgroundColor: COLORS.coralSoft,
    transform: [{ scale: 0.995 }],
  },
  logoutText: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  logoutHint: { marginLeft: "auto", color: COLORS.textSoft, fontSize: 12, fontWeight: "800" },

  pressed: {
    borderColor: "rgba(255,105,105,0.55)",
    backgroundColor: COLORS.coralSoft,
    transform: [{ scale: 0.995 }],
  },
  pressedRow: { backgroundColor: "rgba(255,105,105,0.06)" },
  disabled: { opacity: 0.55 },
});
