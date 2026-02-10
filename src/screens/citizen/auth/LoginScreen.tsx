// src/screens/citizen/auth/LoginScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../../context/AuthContext";
import type { RootStackParamList } from "../../../navigation/navTypes";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onLogin() {
    if (loading) return;

    setMsg(null);
    setLoading(true);

    try {
      const res = await signIn(email, password);

      if (!res.ok) {
        setMsg(res.error ?? "Error");
        return;
      }

      // ✅ FIX: Redirige al Home en modo navegador unificado
      navigation.reset({
        index: 0,
        routes: [{ name: "Discover" }],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.page}>
      <Text style={s.title}>Bolívar Me Enamora</Text>
      <Text style={s.subtitle}>Inicia sesión para continuar</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
        editable={!loading}
        returnKeyType="next"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        style={s.input}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={onLogin}
      />

      <Pressable style={s.btn} onPress={onLogin} disabled={loading}>
        <Text style={s.btnText}>{loading ? "Entrando..." : "Entrar"}</Text>
      </Pressable>

      {msg ? <Text style={s.error}>{msg}</Text> : null}

      <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={{ marginTop: 12 }} disabled={loading}>
        <Text style={s.link}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Signup")} style={{ marginTop: 12 }} disabled={loading}>
        <Text style={s.link}>¿No tienes cuenta? Crear</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { marginTop: 6, opacity: 0.75, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  btn: {
    marginTop: 14,
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "800" },
  error: { marginTop: 10, color: "crimson" },
  link: { color: "#111", textDecorationLine: "underline", fontWeight: "700" },
});
