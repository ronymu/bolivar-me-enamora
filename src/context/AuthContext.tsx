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

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
