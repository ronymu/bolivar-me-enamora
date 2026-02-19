// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseMobile } from "../lib/supabaseMobileClient";
import { usePersistedState } from "../hooks/usePersistedState";

export type UserProfile = {
  id: string;
  role: "citizen" | "organizer" | "admin";
  display_name: string | null;
  full_name: string | null;
  organization_name: string | null;
  avatar_url: string | null;
  phone: string | null; // ✅ Añadido
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isProfileLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  finishPasswordRecoveryFromUrl: (url: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
};

const Ctx = createContext<AuthState | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return v;
}

function parseRecoveryTokens(url: string) {
  if (!url) return {};
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : url.split("?")[1];
  const params = new URLSearchParams(fragment);
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { value: profile, setValue: setProfile, isLoaded: isProfileLoaded } = 
    usePersistedState<UserProfile | null>("auth:profile", null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabaseMobile
        .from("profiles")
        .select("id, role, display_name, full_name, organization_name, avatar_url, phone")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data as UserProfile);
      } else {
        const newProfile = { id: userId, role: "citizen" as const };
        await supabaseMobile.from("profiles").insert(newProfile);
        setProfile(newProfile as any);
      }
    } catch (e) {
      console.warn("[AuthContext] fetchProfile error:", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data } = await supabaseMobile.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
      if (data.session?.user?.id) fetchProfile(data.session.user.id);
    }
    init();

    const { data: sub } = supabaseMobile.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user?.id) fetchProfile(newSession.user.id);
      else setProfile(null);
      setAuthLoading(false);
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseMobile.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabaseMobile.auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    return data.session ? { ok: true } : { ok: true, error: "Revisa tu email." };
  };

  const signOut = async () => {
    setProfile(null);
    await supabaseMobile.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user?.id) return { ok: false, error: "No hay sesión activa" };
    
    const { error } = await supabaseMobile
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id);

    if (error) return { ok: false, error: error.message };
    
    await fetchProfile(session.user.id); 
    return { ok: true };
  };

  const value = useMemo(() => ({
    loading: authLoading || !isProfileLoaded,
    session,
    user: session?.user ?? null,
    profile,
    isProfileLoaded,
    signIn,
    signUp,
    signOut,
    refreshProfile: async () => { if (session?.user?.id) await fetchProfile(session.user.id); },
    updateProfile,
    sendPasswordReset: async (email: string) => {
      const { error } = await supabaseMobile.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "bolivar-me-enamora://reset-password",
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    finishPasswordRecoveryFromUrl: async (url: string, newPassword: string) => {
      const { access_token, refresh_token } = parseRecoveryTokens(url);
      if (!access_token || !refresh_token) return { ok: false, error: "Link inválido." };
      const { error: setErr } = await supabaseMobile.auth.setSession({ access_token, refresh_token });
      if (setErr) return { ok: false, error: setErr.message };
      const { error: upErr } = await supabaseMobile.auth.updateUser({ password: newPassword.trim() });
      if (upErr) return { ok: false, error: upErr.message };
      await signOut();
      return { ok: true };
    },
  }), [authLoading, session, profile, isProfileLoaded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}