// src/screens/citizen/auth/ForgotPasswordScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { RootScreenProps } from "../../../navigation/navTypes";
import { useAuth } from "../../../context/AuthContext";

type Props = RootScreenProps<"ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSend() {
    setMsg(null);
    setLoading(true);
    const res = await sendPasswordReset(email);
    setLoading(false);

    if (!res.ok) {
      setMsg(res.error ?? "Error enviando correo.");
      return;
    }

    setMsg(
      "✅ Listo. Te enviamos un correo para recuperar tu contraseña. Abre el enlace y luego vuelve a la app para iniciar sesión."
    );
  }

  return (
    <View style={s.page}>
      <Text style={s.title}>Recuperar contraseña</Text>
      <Text style={s.subtitle}>
        Te enviaremos un correo con instrucciones para restablecer tu contraseña.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />

      <Pressable style={s.btn} onPress={onSend} disabled={loading}>
        <Text style={s.btnText}>{loading ? "Enviando..." : "Enviar correo"}</Text>
      </Pressable>

      {msg ? (
        <Text style={msg.startsWith("✅") ? s.ok : s.error}>{msg}</Text>
      ) : null}

      <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: 12 }}>
        <Text style={s.link}>Volver a Login</Text>
      </Pressable>

      <Text style={s.note}>
        Nota: si aparece “email rate limit exceeded”, es un límite temporal del
        proveedor de email. Espera un rato e intenta de nuevo.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "900" },
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
  note: { marginTop: 14, opacity: 0.7, fontSize: 12 },
});
