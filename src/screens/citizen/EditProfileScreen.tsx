// src/screens/citizen/EditProfileScreen.tsx
import React, { useState, useEffect } from "react";
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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

// ✅ IMPORTANTE: Importamos desde la ruta 'legacy' como pide Expo 54
import * as FileSystem from 'expo-file-system/legacy'; 

import { decode } from 'base64-arraybuffer';
import { ArrowLeft, Check, Camera, User as UserIcon, Lock } from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { resolveSignedUrl } from "../../lib/mediaSigner";
import { supabaseMobile } from "../../lib/supabaseMobileClient";
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
  const [phone, setPhone] = useState(profile?.phone || "");
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (profile?.avatar_url) {
      resolveSignedUrl(profile.avatar_url, 3600, { bucket: "avatars" }).then((url) => {
        if (alive) setSignedAvatar(url);
      });
    } else {
      setSignedAvatar(null);
    }
    return () => { alive = false; };
  }, [profile?.avatar_url]);

  const pickAndUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], 
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
      });

      if (result.canceled || !result.assets[0]) return;

      const pickedImage = result.assets[0];
      setUploading(true);

      // 1. LEER COMO BASE64 usando la API Legacy (ahora sí funcionará EncodingType)
      const base64 = await FileSystem.readAsStringAsync(pickedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 2. DECODIFICAR
      const arrayBuffer = decode(base64);

      // 3. Preparar ruta
      const fileExt = pickedImage.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 4. SUBIR AL STORAGE
      const { error: uploadError } = await supabaseMobile.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: pickedImage.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 5. ACTUALIZAR BASE DE DATOS
      const { ok, error: updateError } = await updateProfile({ avatar_url: filePath });
      
      if (!ok) throw new Error(updateError);

      Alert.alert("¡Éxito!", "Tu foto de perfil ha sido actualizada.");
    } catch (error: any) {
      console.error("Error detallado:", error);
      Alert.alert("Error", "No se pudo procesar la imagen. Verifica que el servidor de Expo esté actualizado.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "El nombre de usuario es obligatorio.");
      return;
    }
    setLoading(true);
    await updateProfile({
      display_name: displayName.trim(),
      full_name: fullName.trim(),
      phone: phone.trim(),
    });
    setLoading(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerAction}>
            <ArrowLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <Pressable onPress={handleSave} disabled={loading || uploading} style={styles.headerAction}>
            {loading ? <ActivityIndicator size="small" color={COLORS.coral} /> : <Check size={24} color={COLORS.coral} />}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.avatarSection}>
            <Pressable onPress={pickAndUploadImage} disabled={uploading} style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {signedAvatar ? (
                  <Image source={{ uri: signedAvatar }} style={styles.avatarImg} contentFit="cover" transition={200} />
                ) : (
                  <UserIcon size={40} color={COLORS.text} />
                )}
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color="white" />
                  </View>
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Camera size={14} color="white" />
              </View>
            </Pressable>
            <Text style={styles.avatarNote}>Cambiar mi foto</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cuenta vinculada</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputTextDisabled}>{user?.email}</Text>
                <Lock size={14} color={COLORS.textSoft} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholderTextColor={COLORS.textSoft}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={COLORS.textSoft}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textSoft}
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
  avatarWrapper: { position: 'relative' },
  avatarCircle: { width: 100, height: 100, borderRadius: 35, backgroundColor: "rgba(107,100,93,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarNote: { fontSize: 12, color: COLORS.textSoft, marginTop: 12, fontWeight: "600" },
  cameraBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.coral, width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginLeft: 4 },
  input: { height: 54, backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 16, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontWeight: "600", flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputDisabled: { backgroundColor: "rgba(107,100,93,0.04)", borderColor: "transparent" },
  inputTextDisabled: { color: COLORS.textSoft, fontSize: 15, fontWeight: "600" },
});