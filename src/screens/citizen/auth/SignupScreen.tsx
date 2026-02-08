// src/screens/citizen/auth/SignupScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../../context/AuthContext";
import type { RootStackParamList } from "../../../navigation/navTypes";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSignup() {
    setMsg(null);
    setLoading(true);
    const res = await signUp(email, password);
    setLoading(false);

    if (!res.ok) {
      setMsg(res.error ?? "Error");
      return;
    }

    if (res.error) {
      setMsg(res.error);
      return;
    }
  }

  return (
    <View style={s.page}>
      <Text style={s.title}>Crear cuenta</Text>
      <Text style={s.subtitle}>Regístrate con email y contraseña</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        style={s.input}
      />

      <Pressable style={s.btn} onPress={onSignup} disabled={loading}>
        <Text style={s.btnText}>{loading ? "Creando..." : "Crear cuenta"}</Text>
      </Pressable>

      {msg ? <Text style={msg.includes("correo") ? s.ok : s.error}>{msg}</Text> : null}

      <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: 12 }}>
        <Text style={s.link}>¿Ya tienes cuenta? Login</Text>
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
  ok: { marginTop: 10, color: "green" },
  link: { color: "#111", textDecorationLine: "underline", fontWeight: "700" },
});
