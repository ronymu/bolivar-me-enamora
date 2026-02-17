// src/screens/citizen/EditProfileScreen.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Check, User as UserIcon, Lock } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import type { RootScreenProps } from "../../navigation/navTypes";

const COLORS = {
  bg: "#F2F2F2",
  surface: "#FFFFFF",
  text: "#6B645D",
  textSoft: "rgba(107,100,93,0.75)",
  border: "rgba(107,100,93,0.22)",
  coral: "#FF6969",
};

export default function EditProfileScreen({ navigation }: RootScreenProps<"EditProfile">) {
  const { profile, user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || ""); // ✅ Nuevo
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa un nombre de usuario.");
      return;
    }

    try {
      setLoading(true);
      const { ok, error } = await updateProfile({
        display_name: displayName.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(), // ✅ Se envía a Supabase
      });

      if (ok) {
        navigation.goBack();
      } else {
        Alert.alert("Error", error || "No se pudo actualizar el perfil.");
      }
    } catch (e) {
      Alert.alert("Error", "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerAction}>
            <ArrowLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <Pressable onPress={handleSave} disabled={loading} style={styles.headerAction}>
            {loading ? <ActivityIndicator size="small" color={COLORS.coral} /> : <Check size={24} color={COLORS.coral} />}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <UserIcon size={40} color={COLORS.text} />
            </View>
            <Text style={styles.avatarNote}>Avatar sincronizado con la web.</Text>
          </View>

          <View style={styles.form}>
            {/* EMAIL (READ ONLY) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputTextDisabled}>{user?.email}</Text>
                <Lock size={14} color={COLORS.textSoft} />
              </View>
              <Text style={styles.inputHint}>No se puede cambiar desde la app móvil.</Text>
            </View>

            {/* DISPLAY NAME */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ej: Rony_01"
                placeholderTextColor={COLORS.textSoft}
              />
            </View>

            {/* FULL NAME */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ej: Rony Pérez"
                placeholderTextColor={COLORS.textSoft}
              />
            </View>

            {/* PHONE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono de contacto</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej: +57 300 000 0000"
                placeholderTextColor={COLORS.textSoft}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  headerAction: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 20 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarCircle: { width: 80, height: 80, borderRadius: 28, backgroundColor: "rgba(107,100,93,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  avatarNote: { fontSize: 11, color: COLORS.textSoft, fontWeight: "600" },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginLeft: 4 },
  input: { height: 54, backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 16, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontWeight: "600", flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputDisabled: { backgroundColor: "rgba(107,100,93,0.04)", borderColor: "transparent" },
  inputTextDisabled: { color: COLORS.textSoft, fontSize: 15, fontWeight: "600" },
  inputHint: { fontSize: 11, color: COLORS.textSoft, marginLeft: 4, fontWeight: "600" },
});