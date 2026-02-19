// src/screens/citizen/auth/ResetPasswordScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import type { RootScreenProps } from "../../../navigation/navTypes";
import { useAuth } from "../../../context/AuthContext";

type Props = RootScreenProps<"ResetPassword">;

export default function ResetPasswordScreen({ navigation }: Props) {
  const { finishPasswordRecoveryFromUrl } = useAuth();

  const [url, setUrl] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 1) Capturar URL inicial y futuros deep links (por si app ya estaba abierta)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const initial = await Linking.getInitialURL();
      if (mounted) setUrl(initial);
    })();

    const sub = Linking.addEventListener("url", (e) => {
      setUrl(e.url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  async function onSave() {
    setMsg(null);

    if (!url) {
      setMsg("No se detectó el enlace de recuperación. Vuelve a solicitar el correo.");
      return;
    }

    if (!password.trim() || password.trim().length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password.trim() !== password2.trim()) {
      setMsg("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const res = await finishPasswordRecoveryFromUrl(url, password.trim());
    setLoading(false);

    if (!res.ok) {
      setMsg(res.error ?? "No se pudo actualizar la contraseña.");
      return;
    }

    setMsg("✅ Contraseña actualizada. Ahora inicia sesión con tu nueva clave.");
  }

  const canGoLogin = !!msg?.startsWith("✅");

  return (
    <View style={s.page}>
      <Text style={s.title}>Nueva contraseña</Text>
      <Text style={s.subtitle}>
        Crea una contraseña nueva para tu cuenta.
      </Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Nueva contraseña"
        secureTextEntry
        style={s.input}
      />
      <TextInput
        value={password2}
        onChangeText={setPassword2}
        placeholder="Confirmar contraseña"
        secureTextEntry
        style={s.input}
      />

      <Pressable style={s.btn} onPress={onSave} disabled={loading}>
        <Text style={s.btnText}>{loading ? "Guardando..." : "Actualizar contraseña"}</Text>
      </Pressable>

      {msg ? <Text style={msg.startsWith("✅") ? s.ok : s.error}>{msg}</Text> : null}

      <Pressable
        onPress={() => navigation.navigate("Login")}
        style={{ marginTop: 12 }}
        disabled={!canGoLogin}
      >
        <Text style={[s.link, !canGoLogin ? { opacity: 0.5 } : null]}>
          Ir a Login
        </Text>
      </Pressable>

      <Text style={s.note}>
        Si esto falla, pide de nuevo el correo de recuperación y abre el enlace desde el mismo celular donde tienes la app.
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
