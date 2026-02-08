// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseMobile } from "../lib/supabaseMobileClient";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  finishPasswordRecoveryFromUrl: (
    url: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
};

const Ctx = createContext<AuthState | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return v;
}

// Opcional: bootstrap profile citizen (no pisa role)
async function ensureCitizenProfile(userId: string) {
  const { data: existing, error: selErr } = await supabaseMobile
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) return; // no bloqueamos auth por esto
  if (existing?.id) return;

  await supabaseMobile.from("profiles").insert({
    id: userId,
    role: "citizen",
  });
}

// Parse robusto de tokens: Supabase suele mandar en fragment (#...), pero a veces llega en query (?...)
function parseRecoveryTokens(url: string): {
  access_token?: string;
  refresh_token?: string;
  type?: string;
} {
  if (!url) return {};

  // 1) preferimos fragment: ...#access_token=...&refresh_token=...&type=recovery
  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    const fragment = url.slice(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    return {
      access_token: params.get("access_token") ?? undefined,
      refresh_token: params.get("refresh_token") ?? undefined,
      type: params.get("type") ?? undefined,
    };
  }

  // 2) fallback query: ...?access_token=...&refresh_token=...
  const qIndex = url.indexOf("?");
  if (qIndex >= 0) {
    const query = url.slice(qIndex + 1);
    const params = new URLSearchParams(query);
    return {
      access_token: params.get("access_token") ?? undefined,
      refresh_token: params.get("refresh_token") ?? undefined,
      type: params.get("type") ?? undefined,
    };
  }

  return {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabaseMobile.auth.getSession();
      if (!mounted) return;

      setSession(data.session ?? null);
      setLoading(false);

      if (data.session?.user?.id) {
        // bootstrap NO bloqueante
        ensureCitizenProfile(data.session.user.id);
      }
    }

    init();

    const { data: sub } = supabaseMobile.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);

      if (newSession?.user?.id) {
        ensureCitizenProfile(newSession.user.id);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabaseMobile.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabaseMobile.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) return { ok: false, error: error.message };

    // Si hay confirmación de email activa, data.session puede ser null
    if (!data.session) {
      return {
        ok: true,
        error: "Revisa tu correo para confirmar la cuenta y luego inicia sesión.",
      };
    }

    return { ok: true };
  }

  async function signOut() {
    await supabaseMobile.auth.signOut();
  }

  // ✅ Enviar correo de recuperación con deep link directo a la app
  async function sendPasswordReset(email: string) {
    const clean = email.trim();
    if (!clean) return { ok: false, error: "Ingresa tu email." };

    // IMPORTANTE:
    // iOS reconoce esto como deep link hacia tu app (si scheme está configurado).
    // Asegura también que esté permitido en Supabase → Auth → URL Configuration → Redirect URLs.
    const redirectTo = "bolivar-me-enamora://reset-password";

    const { error } = await supabaseMobile.auth.resetPasswordForEmail(clean, {
      redirectTo,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ✅ Finalizar recovery dentro de la app usando tokens del link
  async function finishPasswordRecoveryFromUrl(url: string, newPassword: string) {
    const pwd = newPassword.trim();
    if (pwd.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };

    const { access_token, refresh_token } = parseRecoveryTokens(url);

    if (!access_token || !refresh_token) {
      return { ok: false, error: "Link inválido o incompleto. Vuelve a solicitar recuperación." };
    }

    // 1) Establecer sesión con tokens del recovery
    const { error: setErr } = await supabaseMobile.auth.setSession({
      access_token,
      refresh_token,
    });

    if (setErr) return { ok: false, error: setErr.message };

    // 2) Cambiar password
    const { error: upErr } = await supabaseMobile.auth.updateUser({
      password: pwd,
    });

    if (upErr) return { ok: false, error: upErr.message };

    // 3) Limpieza (recomendado): cerrar sesión y volver a login
    await supabaseMobile.auth.signOut();

    return { ok: true };
  }

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      finishPasswordRecoveryFromUrl,
    }),
    [loading, session]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
